import type { AuthTokenPayload } from "./auth";
import { ForbiddenError, NotFoundError } from "./authorize";
import { chatMessageCutoffIso } from "./chat";
import { supabaseAdmin } from "./supabase/server";
import type {
  AssignmentRow,
  ChatGroupRow,
  ChatGroupWithUnread,
  ClassRow,
  ClassStudentRow,
} from "./supabase/types";

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

/**
 * Loads a class's chat groups, each annotated with the current user's unread
 * count (messages newer than their read cursor, sent by someone else, within
 * the TTL window). One small count query per group — groups per class are few.
 */
export async function listChatGroupsWithUnread(
  classId: string,
  userId: string
): Promise<ChatGroupWithUnread[]> {
  const { data: groups, error } = await supabaseAdmin
    .from("chat_groups")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (groups ?? []) as ChatGroupRow[];
  if (list.length === 0) return [];

  const { data: reads } = await supabaseAdmin
    .from("chat_reads")
    .select("group_id, last_read_at")
    .eq("user_id", userId)
    .in("group_id", list.map((g) => g.id));
  const readMap = new Map<string, string>(
    (reads ?? []).map((r) => [r.group_id as string, r.last_read_at as string])
  );

  const cutoff = chatMessageCutoffIso();
  return Promise.all(
    list.map(async (g) => {
      const lastRead = readMap.get(g.id);
      let query = supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("group_id", g.id)
        .gte("created_at", cutoff)
        .neq("sender_id", userId);
      if (lastRead) query = query.gt("created_at", lastRead);
      const { count } = await query;
      return { ...g, unread: count ?? 0 };
    })
  );
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
