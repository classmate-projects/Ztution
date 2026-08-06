import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, NotFoundError, ValidationError } from "@/lib/authorize";
import { supabaseAdmin, supabaseAnon } from "@/lib/supabase/server";
import { readJsonBody, requireString } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const session = await authenticate(request);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, name, username, email, role, created_at")
      .eq("id", session.userId)
      .maybeSingle();
    if (error) throw error;
    if (!user) throw new NotFoundError("User not found");

    return apiSuccess("Current user retrieved", { user });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Handles two independent, optional concerns in one endpoint — profile
// details (name/username) and a password change — since the profile page
// renders them as two separate forms but both just PATCH the current user.
export async function PATCH(request: NextRequest) {
  try {
    const session = await authenticate(request);
    const body = await readJsonBody(request);

    const profileUpdates: { name?: string; username?: string } = {};

    if (body.name !== undefined) {
      profileUpdates.name = requireString(body.name, "name");
    }

    if (body.username !== undefined) {
      const username = requireString(body.username, "username");
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
        throw new ValidationError(
          "'username' must be 3-32 characters and contain only letters, numbers, and underscores"
        );
      }
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", session.userId)
        .maybeSingle();
      if (existing) {
        throw new ValidationError("This username is already taken");
      }
      profileUpdates.username = username;
    }

    if (body.newPassword !== undefined) {
      const currentPassword = requireString(body.currentPassword, "currentPassword");
      const newPassword = requireString(body.newPassword, "newPassword");
      if (newPassword.length < 8) {
        throw new ValidationError("'newPassword' must be at least 8 characters");
      }

      const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
        email: session.email,
        password: currentPassword,
      });
      if (verifyError) {
        throw new ValidationError("Current password is incorrect");
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(session.userId, {
        password: newPassword,
      });
      if (updateError) throw updateError;
    }

    if (Object.keys(profileUpdates).length === 0 && body.newPassword === undefined) {
      throw new ValidationError("Nothing to update");
    }

    const { data: updated, error } = Object.keys(profileUpdates).length
      ? await supabaseAdmin
          .from("users")
          .update(profileUpdates)
          .eq("id", session.userId)
          .select("id, name, username, email, role, created_at")
          .single()
      : await supabaseAdmin
          .from("users")
          .select("id, name, username, email, role, created_at")
          .eq("id", session.userId)
          .single();
    if (error) throw error;

    return apiSuccess("Profile updated", { user: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
