import { apiError, apiSuccess, toErrorResponse } from "@/lib/api-response";
import { supabaseAdmin, createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEmail, requireString, readJsonBody } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const email = requireEmail(body.email);
    const password = requireString(body.password, "password");

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Same generic message whether the email is unknown or the password is
    // wrong, so login responses can't be used to enumerate registered emails.
    if (error || !data.user) {
      return apiError("Invalid email or password", 401);
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("id, name, username, email, role")
      .eq("id", data.user.id)
      .maybeSingle();

    return apiSuccess("Login successful", { user: profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
