import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return apiSuccess("Logged out successfully");
  } catch (error) {
    return toErrorResponse(error);
  }
}
