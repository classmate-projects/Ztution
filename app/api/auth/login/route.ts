import { signToken, verifyPassword } from "@/lib/auth";
import { apiError, apiSuccess, toErrorResponse } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/authorize";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireEmail, requireString, readJsonBody } from "@/lib/validate";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // keep in sync with signToken's 8h TTL

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const email = requireEmail(body.email);
    const password = requireString(body.password, "password");

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, name, username, email, role, password_hash")
      .eq("email", email)
      .maybeSingle();

    // Same generic message whether the email is unknown or the password is
    // wrong, so login responses can't be used to enumerate registered emails.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return apiError("Invalid email or password", 401);
    }

    const token = await signToken({ userId: user.id, role: user.role, email: user.email });

    const response = apiSuccess("Login successful", {
      token,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
