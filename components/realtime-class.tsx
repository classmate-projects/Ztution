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
    let channel: ReturnType<typeof supabase.channel> | null = null;

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

      // Broadcast fallback: a peer can explicitly ask everyone on this class to
      // re-pull (used when a teacher creates a chat group), which doesn't rely
      // on the Postgres-changes socket's RLS auth. See broadcastClassRefresh.
      ch = ch.on("broadcast", { event: "refresh" }, () => router.refresh());

      channel = ch.subscribe();
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
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
  const channel = supabase.channel(`class:${classId}`);
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
