import { hashPassword } from "@/lib/auth";
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

    const password_hash = await hashPassword(password);
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({ name, username, email, password_hash, role: role as Role })
      .select("id, name, username, email, role, created_at")
      .single();

    if (error || !user) {
      throw error ?? new Error("Failed to create user");
    }

    return apiSuccess("Account created successfully", { user }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
