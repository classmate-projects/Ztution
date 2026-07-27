import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-safe Supabase client (publishable key only) — used exclusively for
 * Realtime (Presence + Broadcast) to signal WebRTC calls. It never touches
 * any table: all data access still goes through our API routes with the
 * secret key in lib/supabase/server.ts.
 */
export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
    );
  }
  return createClient(supabaseUrl, anonKey);
}
