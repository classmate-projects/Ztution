import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, ForbiddenError, NotFoundError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ChatMemberSeen } from "@/lib/supabase/types";

type Params = { params: Promise<{ id: string; groupId: string; messageId: string }> };

/**
 * Read receipts for a message: which class members have seen it (their read
 * cursor is at or past the message's time). Visible to the sender or the
 * teacher. Seeing is group-level — a member "has seen" every message up to the
 * last time they viewed the group.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id, groupId, messageId } = await params;

    const klass = await getClassOrThrow(id);
    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(id, user.userId));
    }

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, group_id, sender_id, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (error) throw error;
    if (!message || message.group_id !== groupId) throw new NotFoundError("Message not found");
    if (message.sender_id !== user.userId && user.role !== "teacher") {
      throw new ForbiddenError("Only the sender or teacher can view message info");
    }

    // Group members = the teacher + every non-suspended student.
    const [{ data: teacher }, { data: enrollments }] = await Promise.all([
      supabaseAdmin.from("users").select("id, name").eq("id", klass.teacher_id).maybeSingle(),
      supabaseAdmin
        .from("class_students")
        .select("users(id, name)")
        .eq("class_id", id)
        .neq("status", "suspended"),
    ]);

    const members: { id: string; name: string }[] = [];
    if (teacher) members.push(teacher as { id: string; name: string });
    // supabase-js types the embedded `users(...)` as an array without generated
    // DB types; it's a single row at runtime (many-to-one).
    const enrollmentRows = (enrollments ?? []) as unknown as {
      users: { id: string; name: string } | null;
    }[];
    for (const row of enrollmentRows) {
      if (row.users) members.push(row.users);
    }
    // Exclude the sender — the question is who *else* has seen it.
    const others = members.filter((m) => m.id !== message.sender_id);

    const { data: reads } = await supabaseAdmin
      .from("chat_reads")
      .select("user_id, last_read_at")
      .eq("group_id", groupId)
      .in("user_id", others.map((m) => m.id).length ? others.map((m) => m.id) : ["__none__"]);
    const readMap = new Map<string, string>(
      (reads ?? []).map((r) => [r.user_id as string, r.last_read_at as string])
    );

    const seenMembers: ChatMemberSeen[] = others.map((m) => {
      const lastRead = readMap.get(m.id);
      return { id: m.id, name: m.name, seen: !!lastRead && lastRead >= message.created_at };
    });

    return apiSuccess("Message info", { members: seenMembers });
  } catch (error) {
    return toErrorResponse(error);
  }
}
