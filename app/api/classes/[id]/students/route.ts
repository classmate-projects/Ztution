import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertOwnsClass, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, requireEmailList, requireString } from "@/lib/validate";

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
    const emails = requireEmailList(body.emails);

    const { data: matches, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .in("email", emails);
    if (usersError) throw usersError;

    const students = (matches ?? []).filter((u) => u.role === "student");
    const foundEmails = new Set(students.map((s) => s.email));
    const notFound = emails.filter((email) => !foundEmails.has(email));

    let alreadyAssigned: string[] = [];
    let added: unknown[] = [];

    if (students.length > 0) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("class_students")
        .select("student_id")
        .eq("class_id", id)
        .in(
          "student_id",
          students.map((s) => s.id)
        );
      if (existingError) throw existingError;

      const existingIds = new Set((existing ?? []).map((row) => row.student_id));
      alreadyAssigned = students.filter((s) => existingIds.has(s.id)).map((s) => s.email);
      const toInsert = students.filter((s) => !existingIds.has(s.id));

      if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("class_students")
          .insert(toInsert.map((s) => ({ class_id: id, student_id: s.id })))
          .select("status, assigned_at, users(id, name, email)");
        if (insertError) throw insertError;
        added = inserted ?? [];
      }
    }

    return apiSuccess("Students processed", { added, alreadyAssigned, notFound });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Suspending keeps the enrollment row (so the student roster/history is
// intact and re-enabling is one click) instead of deleting it like DELETE
// does — for cases like an unpaid fee, where the teacher wants to cut access
// temporarily, not remove the student from the class.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "students:manage");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const studentId = requireString(body.studentId, "studentId");
    const action = body.action;
    if (action !== "suspend" && action !== "reactivate") {
      throw new ValidationError("'action' must be 'suspend' or 'reactivate'");
    }

    const { data: enrollment, error: fetchError } = await supabaseAdmin
      .from("class_students")
      .select("status, joined_at")
      .eq("class_id", id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!enrollment) throw new NotFoundError("Student is not assigned to this class");

    // Reactivating restores whatever stage the student was at before being
    // suspended — back to "active" if they'd already joined, or "assigned"
    // if they were suspended before ever joining.
    const nextStatus = action === "suspend" ? "suspended" : enrollment.joined_at ? "active" : "assigned";

    const { data, error } = await supabaseAdmin
      .from("class_students")
      .update({ status: nextStatus })
      .eq("class_id", id)
      .eq("student_id", studentId)
      .select("status, assigned_at, joined_at, users(id, name, email)")
      .single();
    if (error) throw error;

    return apiSuccess(action === "suspend" ? "Student suspended" : "Student reactivated", { enrollment: data });
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
