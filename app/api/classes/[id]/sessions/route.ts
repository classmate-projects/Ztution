import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id } = await params;
    const klass = await getClassOrThrow(id);

    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(id, user.userId));
    }

    const { data, error } = await supabaseAdmin
      .from("class_sessions")
      .select("*")
      .eq("class_id", id)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;

    return apiSuccess("Sessions retrieved", { sessions: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// No `scheduledAt` (or one that's already in the past) starts the class right
// now; a future `scheduledAt` books it for later — this is both "instant
// start" and "class scheduling" from a single endpoint.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "session:create");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const title = requireString(body.title, "title");

    const now = new Date();
    const scheduledAt =
      typeof body.scheduledAt === "string" && !Number.isNaN(Date.parse(body.scheduledAt))
        ? new Date(body.scheduledAt)
        : now;
    const isInstant = scheduledAt.getTime() <= now.getTime();

    const { data, error } = await supabaseAdmin
      .from("class_sessions")
      .insert({
        class_id: id,
        teacher_id: user.userId,
        title,
        scheduled_at: scheduledAt.toISOString(),
        status: isInstant ? "live" : "scheduled",
        started_at: isInstant ? now.toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess(
      isInstant ? "Class started" : "Class scheduled successfully",
      { session: data },
      201
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
