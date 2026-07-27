import type { AuthTokenPayload } from "./auth";
import { ForbiddenError, NotFoundError } from "./authorize";
import { supabaseAdmin } from "./supabase/server";
import type { AssignmentRow, ClassRow, ClassStudentRow } from "./supabase/types";

export async function getClassOrThrow(classId: string): Promise<ClassRow> {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Class not found");
  return data;
}

export function assertOwnsClass(klass: ClassRow, user: AuthTokenPayload) {
  if (klass.teacher_id !== user.userId) {
    throw new ForbiddenError("You do not own this class");
  }
}

export async function getEnrollment(
  classId: string,
  studentId: string
): Promise<ClassStudentRow | null> {
  const { data, error } = await supabaseAdmin
    .from("class_students")
    .select("*")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function assertEnrolled(enrollment: ClassStudentRow | null) {
  if (!enrollment) {
    throw new ForbiddenError("You are not assigned to this class");
  }
}

export async function getAssignmentOrThrow(assignmentId: string): Promise<AssignmentRow> {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Assignment not found");
  return data;
}
