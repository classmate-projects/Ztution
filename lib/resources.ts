import type { AuthTokenPayload } from "./auth";
import { ForbiddenError, NotFoundError } from "./authorize";
import { supabaseAdmin } from "./supabase/server";
import type { AssignmentRow, ChatGroupRow, ClassRow, ClassStudentRow } from "./supabase/types";

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
  if (enrollment.status === "suspended") {
    throw new ForbiddenError("Your access to this class has been suspended");
  }
}

/**
 * Loads a chat group and asserts it belongs to `classId` — guards against a
 * caller pairing a group id from one class with another class's route.
 */
export async function getChatGroupOrThrow(
  groupId: string,
  classId: string
): Promise<ChatGroupRow> {
  const { data, error } = await supabaseAdmin
    .from("chat_groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.class_id !== classId) throw new NotFoundError("Chat group not found");
  return data;
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
