import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, NotFoundError } from "@/lib/authorize";
import { supabaseAdmin } from "@/lib/supabase/server";

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
