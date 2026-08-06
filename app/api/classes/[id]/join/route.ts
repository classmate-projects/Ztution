import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertEnrolled, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "class:join");
    const { id } = await params;

    await getClassOrThrow(id);
    const enrollment = await getEnrollment(id, user.userId);
    assertEnrolled(enrollment);

    if (enrollment!.status === "active") {
      throw new ValidationError("You have already joined this class");
    }

    const { data, error } = await supabaseAdmin
      .from("class_students")
      .update({ status: "active", joined_at: new Date().toISOString() })
      .eq("class_id", id)
      .eq("student_id", user.userId)
      .select("*")
      .single();
    if (error) throw error;

    await clearInviteNotifications(id, user.userId);

    return apiSuccess("Joined class successfully", { enrollment: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Declining deletes the enrollment row outright (there's no 'declined'
// status) — the invite is cancelled, and the teacher can re-invite the same
// email later without a stale row in the way.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "class:join");
    const { id } = await params;

    const enrollment = await getEnrollment(id, user.userId);
    if (!enrollment) throw new NotFoundError("You don't have a pending invitation for this class");
    if (enrollment.status !== "assigned") {
      throw new ValidationError("Only a pending invitation can be declined");
    }

    const { error } = await supabaseAdmin
      .from("class_students")
      .delete()
      .eq("class_id", id)
      .eq("student_id", user.userId);
    if (error) throw error;

    await clearInviteNotifications(id, user.userId);

    return apiSuccess("Invitation declined");
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Once an invite is resolved (joined or declined), the "you've been added"
// notification that prompted it is stale — clearing it is what stops the
// dropdown from re-offering Join/Decline for something already decided.
async function clearInviteNotifications(classId: string, studentId: string) {
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("user_id", studentId)
    .eq("class_id", classId)
    .eq("type", "class_invite");
  if (error) console.error("Failed to clear class invite notifications", error);
}
