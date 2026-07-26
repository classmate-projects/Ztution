import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertOwnsClass, getAssignmentOrThrow, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/validate";

type Params = { params: Promise<{ id: string; submissionId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "submission:evaluate");
    const { id, submissionId } = await params;

    const assignment = await getAssignmentOrThrow(id);
    const klass = await getClassOrThrow(assignment.class_id);
    assertOwnsClass(klass, user);

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("id", submissionId)
      .eq("assignment_id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!submission) throw new NotFoundError("Submission not found for this assignment");

    const body = await readJsonBody(request);
    if (typeof body.grade !== "number" || Number.isNaN(body.grade)) {
      throw new ValidationError("'grade' must be a number");
    }
    const feedback = typeof body.feedback === "string" ? body.feedback : null;

    const { data, error } = await supabaseAdmin
      .from("submissions")
      .update({ grade: body.grade, feedback, evaluated_at: new Date().toISOString() })
      .eq("id", submissionId)
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Submission evaluated successfully", { submission: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
