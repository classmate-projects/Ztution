import type { NextRequest } from "next/server";
import { InvalidTokenError, verifyToken, type AuthTokenPayload } from "./auth";
import type { Role } from "./supabase/types";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export class ValidationError extends Error {}
export class NotFoundError extends Error {}

/** httpOnly cookie the browser flow uses instead of a bearer header. */
export const SESSION_COOKIE_NAME = "ztution_session";

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
  ],
  student: ["class:join", "material:view", "assignment:submit"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof PERMISSIONS)[Role][number];

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

/**
 * Extracts and verifies the session token — the httpOnly cookie set by the
 * browser login flow, or a `Bearer` header for direct API use (curl/Postman).
 * userId/role/email always come from the verified token payload, never from
 * client-supplied body/query fields — trusting a client-supplied role would
 * let a student self-escalate to teacher.
 */
export async function authenticate(request: NextRequest): Promise<AuthTokenPayload> {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const header = request.headers.get("authorization");
  const headerToken = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const token = cookieToken || headerToken;
  if (!token) {
    throw new UnauthorizedError("Missing session cookie or Authorization header");
  }
  try {
    return await verifyToken(token);
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw new UnauthorizedError(error.message);
    }
    throw error;
  }
}

export function requirePermission(user: AuthTokenPayload, permission: Permission) {
  if (!can(user.role, permission)) {
    throw new ForbiddenError(`Role '${user.role}' cannot perform '${permission}'`);
  }
}
