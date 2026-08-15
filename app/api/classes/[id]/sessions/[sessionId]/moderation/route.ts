import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertOwnsClass, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireString, optionalEnum } from "@/lib/validate";

type Params = { params: Promise<{ id: string; sessionId: string }> };

const ACTIONS = ["remove", "admit"] as const;

/** Persists a teacher's remove/re-admit decision for a student in a live call, so it survives the student leaving and rejoining. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "session:manage");
    const { id, sessionId } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const { data: session, error: fetchError } = await supabaseAdmin
      .from("class_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("class_id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!session) throw new NotFoundError("Session not found for this class");

    const body = await readJsonBody(request);
    const action = optionalEnum(body.action, "action", ACTIONS);
    if (!action) throw new ValidationError("'action' must be 'remove' or 'admit'");
    const studentId = requireString(body.studentId, "studentId");

    if (action === "remove") {
      const { error } = await supabaseAdmin.from("session_removed_students").upsert(
        {
          session_id: sessionId,
          student_id: studentId,
          removed_at: new Date().toISOString(),
          readmitted_at: null,
        },
        { onConflict: "session_id,student_id" }
      );
      if (error) throw error;
      return apiSuccess("Student removed from the session");
    }

    const { error } = await supabaseAdmin
      .from("session_removed_students")
      .update({ readmitted_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("student_id", studentId);
    if (error) throw error;
    return apiSuccess("Student re-admitted to the session");
  } catch (error) {
    return toErrorResponse(error);
  }
}
