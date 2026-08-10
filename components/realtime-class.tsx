"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** Child tables that carry a `class_id` we can filter on directly. */
const CLASS_ID_TABLES = ["class_sessions", "class_students", "materials", "chat_groups"] as const;

/**
 * Keeps a class page live for every viewer. Subscribes to Postgres Changes on
 * the class row and its child tables (sessions, enrollments, materials) and
 * calls router.refresh() on any insert/update/delete, so the server component
 * re-fetches and re-renders. The server stays the single source of truth
 * (authorization still runs there) — this only decides *when* to re-pull.
 *
 * Requires RLS SELECT policies + the supabase_realtime publication on those
 * tables (see supabase/schema.sql). Like the notifications subscription, the
 * Realtime socket has to be authenticated as the current user (setAuth with
 * the access token, refreshed when it rotates) or RLS silently drops events.
 */
export function RealtimeClassRefresher({ classId }: { classId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    // Coalesce bursts of refresh signals (e.g. several chat messages in a row)
    // into a single re-pull.
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 400);
    };

    // Broadcast "re-pull" pings (chat groups created/renamed, messages sent →
    // unread badges) ride their OWN dedicated client. This is the crucial bit:
    // the postgres_changes client below can get an unhealthy socket (RLS), and
    // sharing that socket silently kills broadcast delivery too — which is why
    // chat messages (their own isolated broadcast client) work but this didn't.
    const broadcastClient = createBrowserSupabaseClient();
    const refreshChannel = broadcastClient
      .channel(`class-refresh:${classId}`)
      .on("broadcast", { event: "refresh" }, () => scheduleRefresh());
    refreshChannel.subscribe();

    // Separate client for Postgres Changes (best-effort; may be unhealthy).
    const pgClient = createBrowserSupabaseClient();
    let pgChannel: ReturnType<typeof pgClient.channel> | null = null;

    const {
      data: { subscription: authSubscription },
    } = pgClient.auth.onAuthStateChange((_event, session) => {
      if (session) pgClient.realtime.setAuth(session.access_token);
    });

    pgClient.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) pgClient.realtime.setAuth(session.access_token);

      let ch = pgClient
        .channel(`class:${classId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "classes", filter: `id=eq.${classId}` },
          () => scheduleRefresh()
        );

      for (const table of CLASS_ID_TABLES) {
        ch = ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `class_id=eq.${classId}` },
          () => scheduleRefresh()
        );
      }

      pgChannel = ch.subscribe();
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      authSubscription.unsubscribe();
      broadcastClient.removeChannel(refreshChannel);
      if (pgChannel) pgClient.removeChannel(pgChannel);
    };
  }, [classId, router]);

  return null;
}

/**
 * One persistent sender channel per class, kept subscribed for the page's
 * lifetime. Reused across calls so frequent pings (e.g. every chat message)
 * are reliable — recreating/tearing down a channel per call is racy and can
 * silently drop the first send.
 */
const refreshSenders = new Map<string, { channel: RealtimeChannel; ready: Promise<void> }>();

function refreshSender(classId: string) {
  let entry = refreshSenders.get(classId);
  if (!entry) {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`class-refresh:${classId}`);
    const ready = new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
    entry = { channel, ready };
    refreshSenders.set(classId, entry);
  }
  return entry;
}

/**
 * Ask every open viewer of a class (via Broadcast) to re-pull the server
 * component — their RealtimeClassRefresher listens for the "refresh" event.
 * Use after a mutation whose Postgres-changes event may not reach other
 * clients reliably (chat groups created/renamed, messages sent → unread badges).
 */
export async function broadcastClassRefresh(classId: string) {
  const { channel, ready } = refreshSender(classId);
  await ready;
  await channel.send({ type: "broadcast", event: "refresh", payload: {} });
}
