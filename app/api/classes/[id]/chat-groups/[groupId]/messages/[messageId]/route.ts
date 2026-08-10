import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, ForbiddenError, NotFoundError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/storage";

type Params = { params: Promise<{ id: string; groupId: string; messageId: string }> };

async function assertCanAccessClassChat(
  classId: string,
  user: Awaited<ReturnType<typeof authenticate>>
) {
  const klass = await getClassOrThrow(classId);
  if (user.role === "teacher") {
    assertOwnsClass(klass, user);
  } else {
    assertEnrolled(await getEnrollment(classId, user.userId));
  }
}

/** Delete a message for everyone — only the sender may do this. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id, groupId, messageId } = await params;
    await assertCanAccessClassChat(id, user);

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, group_id, sender_id, attachment_path")
      .eq("id", messageId)
      .maybeSingle();
    if (error) throw error;
    if (!message || message.group_id !== groupId) throw new NotFoundError("Message not found");
    if (message.sender_id !== user.userId) {
      throw new ForbiddenError("You can only delete your own messages");
    }

    if (message.attachment_path) {
      await supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([message.attachment_path]);
    }
    // Reactions cascade via FK; reply quotes elsewhere are snapshotted so they survive.
    const { error: deleteError } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("id", messageId);
    if (deleteError) throw deleteError;

    return apiSuccess("Message deleted");
  } catch (error) {
    return toErrorResponse(error);
  }
}
