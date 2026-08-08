import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-safe Supabase client — used for Realtime: Presence + Broadcast to
 * signal WebRTC calls, and Postgres Changes for live notifications. Uses
 * @supabase/ssr so it shares the same session cookies as the server client
 * (lib/supabase/server.ts), which is what lets a Postgres Changes
 * subscription be scoped by RLS (auth.uid()) instead of exposing a table to
 * anyone holding the anon key. Table data access for anything else still
 * goes through our API routes with the secret key server-side.
 */
export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
    );
  }
  return createBrowserClient(supabaseUrl, anonKey);
}
