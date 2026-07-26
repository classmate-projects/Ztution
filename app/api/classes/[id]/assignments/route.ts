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
      .from("assignments")
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return apiSuccess("Assignments retrieved", { assignments: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "assignment:create");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const title = requireString(body.title, "title");
    const description = typeof body.description === "string" ? body.description : null;
    const due_date = typeof body.dueDate === "string" ? body.dueDate : null;

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert({ class_id: id, teacher_id: user.userId, title, description, due_date })
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Assignment created successfully", { assignment: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
