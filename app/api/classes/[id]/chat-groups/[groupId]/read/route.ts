import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import {
  assertEnrolled,
  assertOwnsClass,
  getChatGroupOrThrow,
  getClassOrThrow,
  getEnrollment,
} from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; groupId: string }> };

/** Mark this group as read up to now for the current user (read cursor). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:message");
    const { id, groupId } = await params;

    const klass = await getClassOrThrow(id);
    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(id, user.userId));
    }
    await getChatGroupOrThrow(groupId, id);

    const { error } = await supabaseAdmin
      .from("chat_reads")
      .upsert(
        { group_id: groupId, user_id: user.userId, last_read_at: new Date().toISOString() },
        { onConflict: "group_id,user_id" }
      );
    if (error) throw error;

    return apiSuccess("Marked read");
  } catch (error) {
    return toErrorResponse(error);
  }
}
