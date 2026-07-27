import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getAssignmentOrThrow, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

// Teachers only. A student's submission is private between them and the
// teacher, so this must never expose classmates' submissions to a student.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "submission:evaluate");
    const { id } = await params;

    const assignment = await getAssignmentOrThrow(id);
    const klass = await getClassOrThrow(assignment.class_id);
    assertOwnsClass(klass, user);

    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select("*, users(id, name, email)")
      .eq("assignment_id", id)
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    return apiSuccess("Submissions retrieved", { submissions: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "assignment:submit");
    const { id } = await params;

    const assignment = await getAssignmentOrThrow(id);
    assertEnrolled(await getEnrollment(assignment.class_id, user.userId));

    const body = await readJsonBody(request);
    const content = requireString(body.content, "content");

    const { data: existing } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("assignment_id", id)
      .eq("student_id", user.userId)
      .maybeSingle();
    if (existing) {
      throw new ValidationError("You have already submitted this assignment");
    }

    const { data, error } = await supabaseAdmin
      .from("submissions")
      .insert({ assignment_id: id, student_id: user.userId, content })
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Assignment submitted successfully", { submission: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
