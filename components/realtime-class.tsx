"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    let pgChannel: ReturnType<typeof supabase.channel> | null = null;

    // A dedicated, broadcast-only channel for explicit "re-pull" pings (used
    // when a teacher creates/renames a chat group). It's kept SEPARATE from the
    // postgres_changes channel below: broadcast delivery must not depend on the
    // Realtime RLS socket being healthy — that's the same reason chat messages
    // ride their own broadcast channel. See broadcastClassRefresh.
    const refreshChannel = supabase
      .channel(`class-refresh:${classId}`)
      .on("broadcast", { event: "refresh" }, () => router.refresh());
    refreshChannel.subscribe();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      let ch = supabase
        .channel(`class:${classId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "classes", filter: `id=eq.${classId}` },
          () => router.refresh()
        );

      for (const table of CLASS_ID_TABLES) {
        ch = ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `class_id=eq.${classId}` },
          () => router.refresh()
        );
      }

      pgChannel = ch.subscribe();
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      supabase.removeChannel(refreshChannel);
      if (pgChannel) supabase.removeChannel(pgChannel);
    };
  }, [classId, router]);

  return null;
}

/**
 * Ask every open viewer of a class (via Broadcast) to re-pull the server
 * component — their RealtimeClassRefresher listens for the "refresh" event.
 * Use after a mutation whose Postgres-changes event may not reach other
 * clients reliably (e.g. creating a chat group).
 */
export async function broadcastClassRefresh(classId: string) {
  const supabase = createBrowserSupabaseClient();
  const channel = supabase.channel(`class-refresh:${classId}`);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await channel.send({ type: "broadcast", event: "refresh", payload: {} });
  // Give the message time to flush before tearing the channel down.
  setTimeout(() => {
    supabase.removeChannel(channel);
  }, 2000);
}
