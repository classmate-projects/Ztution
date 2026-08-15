import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, ForbiddenError, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertEnrolled, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, optionalEnum, requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string; sessionId: string }> };

const ACTIONS = ["join", "leave"] as const;

/**
 * Self-reported attendance for a call session, used to build the post-call
 * summary report. Students only — the teacher isn't tracked. "leave" is
 * called both from explicit UI actions and via `navigator.sendBeacon` on tab
 * close, so it accepts a plain POST with a JSON body (no custom headers).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    if (user.role !== "student") throw new ForbiddenError("Only students have attendance tracked");
    const { id, sessionId } = await params;

    const enrollment = await getEnrollment(id, user.userId);
    assertEnrolled(enrollment);

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
    if (!action) throw new ValidationError("'action' must be 'join' or 'leave'");

    if (action === "join") {
      const { data, error } = await supabaseAdmin
        .from("session_attendance")
        .insert({ session_id: sessionId, student_id: user.userId })
        .select("id")
        .single();
      if (error) throw error;
      return apiSuccess("Attendance recorded", { attendanceId: data.id });
    }

    const attendanceId = requireString(body.attendanceId, "attendanceId");
    const { error } = await supabaseAdmin
      .from("session_attendance")
      .update({ left_at: new Date().toISOString() })
      .eq("id", attendanceId)
      .eq("session_id", sessionId)
      .eq("student_id", user.userId);
    if (error) throw error;
    return apiSuccess("Attendance updated");
  } catch (error) {
    return toErrorResponse(error);
  }
}
