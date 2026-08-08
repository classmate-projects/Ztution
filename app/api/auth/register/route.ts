import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/authorize";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireEmail, requireString, readJsonBody } from "@/lib/validate";
import type { Role } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const name = requireString(body.name, "name");
    const username = requireString(body.username, "username");
    const email = requireEmail(body.email);
    const password = requireString(body.password, "password");
    const role = body.role;

    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      throw new ValidationError(
        "'username' must be 3-32 characters and contain only letters, numbers, and underscores"
      );
    }
    if (role !== "teacher" && role !== "student") {
      throw new ValidationError("'role' must be either 'teacher' or 'student'");
    }
    if (password.length < 8) {
      throw new ValidationError("'password' must be at least 8 characters");
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id, email, username")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();
    if (existing) {
      throw new ValidationError(
        existing.email === email
          ? "An account with this email already exists"
          : "This username is already taken"
      );
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no email-verification step today; preserve instant login
      user_metadata: { name, username },
      app_metadata: { role: role as Role },
    });

    if (error || !created.user) {
      throw new ValidationError(error?.message ?? "Failed to create user");
    }

    // public.users is populated by the handle_new_user trigger (supabase/schema.sql),
    // but the trigger's `coalesce(new.raw_app_meta_data ->> 'role', 'student')` reads
    // app_metadata as of the AFTER INSERT snapshot, which Supabase Auth apparently
    // doesn't always populate synchronously with the INSERT — confirmed empirically
    // (a createUser call with app_metadata.role: 'teacher' still landed as 'student'
    // in public.users). Rather than depend on that timing, enforce the role we
    // already know authoritatively here.
    const { data: user, error: profileError } = await supabaseAdmin
      .from("users")
      .update({ role: role as Role })
      .eq("id", created.user.id)
      .select("id, name, username, email, role, created_at")
      .single();
    if (profileError) throw profileError;

    return apiSuccess("Account created successfully", { user }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
