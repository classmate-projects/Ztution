import { cookies } from "next/headers";
import { verifyToken, type AuthTokenPayload } from "./auth";
import { SESSION_COOKIE_NAME } from "./authorize";

/** Server Component/layout helper — reads and verifies the session cookie directly, no HTTP round-trip. */
export async function getSession(): Promise<AuthTokenPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
