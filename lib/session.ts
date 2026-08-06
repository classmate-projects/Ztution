import { toAuthPayload, type AuthTokenPayload } from "./auth";
import { createServerSupabaseClient } from "./supabase/server";

/** Server Component/layout helper — reads the Supabase session cookie, no HTTP round-trip. */
export async function getSession(): Promise<AuthTokenPayload | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return toAuthPayload(user);
}
