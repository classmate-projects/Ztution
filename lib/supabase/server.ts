import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
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

/**
 * Plain anon-key client with no cookie binding — used only for one-off auth
 * operations that shouldn't touch the current request's session cookies
 * (e.g. re-verifying a user's current password via signInWithPassword before
 * letting them set a new one).
 */
export const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Cookie-bound Supabase client acting as the signed-in user, for Server
 * Components (read-only cookies) and Route Handlers (which can also write
 * cookies). `setAll` failures are swallowed for the Server Component case —
 * proxy.ts (lib/supabase/middleware.ts) refreshes the session cookies on
 * every request, so a render that can't write cookies itself is fine.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called during a Server Component render — cookies() is read-only there.
        }
      },
    },
  });
}
