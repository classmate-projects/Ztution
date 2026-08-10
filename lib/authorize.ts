import type { NextRequest } from "next/server";
import { toAuthPayload, type AuthTokenPayload } from "./auth";
import { supabaseAdmin, createServerSupabaseClient } from "./supabase/server";
import type { Role } from "./supabase/types";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export class ValidationError extends Error {}
export class NotFoundError extends Error {}

/**
 * Single source of truth for what each role is allowed to do (see AGENTS.md
 * role definitions). Resource ownership (e.g. "only the teacher who owns this
 * class") is a separate, per-route check — this only covers role-level access.
 */
export const PERMISSIONS = {
  teacher: [
    "class:create",
    "class:update",
    "class:delete",
    "material:upload",
    "material:manage",
    "students:view",
    "students:manage",
    "assignment:create",
    "submission:evaluate",
    "session:create",
    "session:manage",
    "chat:manage",
    "chat:message",
  ],
  student: ["class:join", "material:view", "assignment:submit", "billing:manage", "chat:message"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof PERMISSIONS)[Role][number];

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

/**
 * Extracts and verifies the current Supabase Auth user — from the httpOnly
 * session cookies set by the browser login flow, or a `Bearer` access token
 * for direct API use (curl/Postman). userId/role/email always come from the
 * verified Supabase user, never from client-supplied body/query fields —
 * trusting a client-supplied role would let a student self-escalate to
 * teacher.
 */
export async function authenticate(request: NextRequest): Promise<AuthTokenPayload> {
  const header = request.headers.get("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (bearerToken) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(bearerToken);
    if (error || !user) throw new UnauthorizedError("Invalid or expired token");
    const payload = toAuthPayload(user);
    if (!payload) throw new UnauthorizedError("Token payload is malformed");
    return payload;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError("Missing session cookie or Authorization header");
  const payload = toAuthPayload(user);
  if (!payload) throw new UnauthorizedError("Token payload is malformed");
  return payload;
}

export function requirePermission(user: AuthTokenPayload, permission: Permission) {
  if (!can(user.role, permission)) {
    throw new ForbiddenError(`Role '${user.role}' cannot perform '${permission}'`);
  }
}
