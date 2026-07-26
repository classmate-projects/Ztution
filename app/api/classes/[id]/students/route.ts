import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError, NotFoundError } from "@/lib/authorize";
import { assertOwnsClass, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireEmail } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

// Teachers only: students never see their classmates, per the "cannot view
// other students' private data" rule.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "students:view");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const { data, error } = await supabaseAdmin
      .from("class_students")
      .select("status, assigned_at, joined_at, users(id, name, email)")
      .eq("class_id", id);
    if (error) throw error;

    return apiSuccess("Student list retrieved", { students: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "students:manage");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const email = requireEmail(body.email);

    const { data: student, error: studentError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student || student.role !== "student") {
      throw new NotFoundError("No student account found with this email");
    }

    const { data: existing } = await supabaseAdmin
      .from("class_students")
      .select("class_id")
      .eq("class_id", id)
      .eq("student_id", student.id)
      .maybeSingle();
    if (existing) {
      throw new ValidationError("Student is already assigned to this class");
    }

    const { data, error } = await supabaseAdmin
      .from("class_students")
      .insert({ class_id: id, student_id: student.id })
      .select("status, assigned_at, users(id, name, email)")
      .single();
    if (error) throw error;

    return apiSuccess("Student assigned to class", { enrollment: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "students:manage");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      throw new ValidationError("'studentId' query parameter is required");
    }

    const { error } = await supabaseAdmin
      .from("class_students")
      .delete()
      .eq("class_id", id)
      .eq("student_id", studentId);
    if (error) throw error;

    return apiSuccess("Student removed from class");
  } catch (error) {
    return toErrorResponse(error);
  }
}
