"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** Child tables that carry a `class_id` we can filter on directly. */
const CLASS_ID_TABLES = ["class_sessions", "class_students", "materials"] as const;

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
