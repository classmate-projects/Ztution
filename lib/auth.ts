import type { User } from "@supabase/supabase-js";
import type { Role } from "./supabase/types";

export interface AuthTokenPayload {
  userId: string;
  role: Role;
  email: string;
}

/**
 * `role` lives in `app_metadata` (set only via the service-role admin API at
 * signup — see supabase/schema.sql's handle_new_user trigger), never in the
 * client-writable `user_metadata`, so a user can never grant themselves the
 * other role.
 */
export function toAuthPayload(user: User): AuthTokenPayload | null {
  const role = user.app_metadata?.role;
  if ((role !== "teacher" && role !== "student") || !user.email) return null;
  return { userId: user.id, role, email: user.email };
}
