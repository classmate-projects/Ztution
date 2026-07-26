import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertOwnsClass, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/validate";
import type { SessionStatus } from "@/lib/supabase/types";

type Params = { params: Promise<{ id: string; sessionId: string }> };

const TRANSITIONS: Record<string, SessionStatus> = {
  start: "live",
  end: "ended",
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "session:manage");
    const { id, sessionId } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const { data: session, error: fetchError } = await supabaseAdmin
      .from("class_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("class_id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!session) throw new NotFoundError("Session not found for this class");

    const body = await readJsonBody(request);
    const action = body.action;
    if (action !== "start" && action !== "end") {
      throw new ValidationError("'action' must be either 'start' or 'end'");
    }

    if (action === "start" && session.status !== "scheduled") {
      throw new ValidationError(`Cannot start a session with status '${session.status}'`);
    }
    if (action === "end" && session.status !== "live") {
      throw new ValidationError(`Cannot end a session with status '${session.status}'`);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("class_sessions")
      .update({
        status: TRANSITIONS[action],
        ...(action === "start" ? { started_at: now } : { ended_at: now }),
      })
      .eq("id", sessionId)
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess(action === "start" ? "Class started" : "Class ended", { session: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
