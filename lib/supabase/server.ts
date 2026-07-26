import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

/**
 * Server-only Supabase client authenticated with the service role key.
 * Bypasses Row Level Security — authorization is enforced in lib/authorize.ts
 * instead. Never import this file from client components.
 *
 * Untyped on purpose: without real `supabase gen types` codegen, a hand-rolled
 * Database generic can't model relationship embeds (e.g. `classes(*)`) the way
 * supabase-js expects, so callers annotate results with the Row types from
 * ./types instead of relying on the client's generic.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
