import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import {
  authenticate,
  ForbiddenError,
  NotFoundError,
  requirePermission,
  ValidationError,
} from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/storage";
import { isWithinEditWindow } from "@/lib/chat";
import { readJsonBody } from "@/lib/validate";

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

/** Edit a message's text — only the sender, only within the edit window. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:message");
    const { id, groupId, messageId } = await params;
    await assertCanAccessClassChat(id, user);

    const bodyJson = await readJsonBody<{ body?: unknown }>(request);
    const newBody =
      typeof bodyJson.body === "string" && bodyJson.body.trim().length > 0
        ? bodyJson.body.trim()
        : null;

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, group_id, sender_id, attachment_path, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (error) throw error;
    if (!message || message.group_id !== groupId) throw new NotFoundError("Message not found");
    if (message.sender_id !== user.userId) {
      throw new ForbiddenError("You can only edit your own messages");
    }
    if (!isWithinEditWindow(message.created_at)) {
      throw new ForbiddenError("This message can no longer be edited");
    }
    // A message must still have text or an attachment after the edit.
    if (!newBody && !message.attachment_path) {
      throw new ValidationError("Message text can't be empty");
    }

    const { error: updateError } = await supabaseAdmin
      .from("chat_messages")
      .update({ body: newBody, edited_at: new Date().toISOString() })
      .eq("id", messageId);
    if (updateError) throw updateError;

    return apiSuccess("Message updated");
  } catch (error) {
    return toErrorResponse(error);
  }
}
