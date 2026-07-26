import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError } from "@/lib/authorize";
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

    return apiSuccess("Joined class successfully", { enrollment: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
