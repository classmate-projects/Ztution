import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

/** Teacher owns the class, or the caller is an active enrolled student. */
async function assertCanAccessClassChat(classId: string, user: Awaited<ReturnType<typeof authenticate>>) {
  const klass = await getClassOrThrow(classId);
  if (user.role === "teacher") {
    assertOwnsClass(klass, user);
  } else {
    assertEnrolled(await getEnrollment(classId, user.userId));
  }
  return klass;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id } = await params;
    await assertCanAccessClassChat(id, user);

    const { data, error } = await supabaseAdmin
      .from("chat_groups")
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return apiSuccess("Chat groups retrieved", { groups: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:manage");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const name = requireString(body.name, "name");
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    const { data, error } = await supabaseAdmin
      .from("chat_groups")
      .insert({ class_id: id, name, description, created_by: user.userId })
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Chat group created", { group: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
