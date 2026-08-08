import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate } from "@/lib/authorize";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const [{ data: notifications, error }, { count: unreadCount, error: countError }] = await Promise.all([
      supabaseAdmin
        .from("notifications")
        .select("id, type, class_id, message, read_at, created_at")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.userId)
        .is("read_at", null),
    ]);
    if (error) throw error;
    if (countError) throw countError;

    return apiSuccess("Notifications retrieved", { notifications: notifications ?? [], unreadCount: unreadCount ?? 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.userId)
      .is("read_at", null);
    if (error) throw error;

    return apiSuccess("Notifications marked read");
  } catch (error) {
    return toErrorResponse(error);
  }
}
