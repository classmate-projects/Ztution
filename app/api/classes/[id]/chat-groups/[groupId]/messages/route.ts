import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError } from "@/lib/authorize";
import {
  assertEnrolled,
  assertOwnsClass,
  getChatGroupOrThrow,
  getClassOrThrow,
  getEnrollment,
} from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  buildChatAttachmentPath,
  CHAT_ATTACHMENTS_BUCKET,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
} from "@/lib/storage";
import { chatMessageCutoffIso } from "@/lib/chat";

type Params = { params: Promise<{ id: string; groupId: string }> };

const MESSAGE_SELECT =
  "id, group_id, sender_id, body, attachment_name, attachment_mime, attachment_size, reply_to_id, reply_to_sender, reply_to_preview, created_at, sender:users(id, name, role), reactions:chat_reactions(user_id, emoji, user:users(id, name))";

/** Short single-line preview of a message, used to snapshot a reply quote. */
function messagePreview(body: string | null, attachmentName: string | null): string {
  if (body && body.trim().length > 0) {
    const flat = body.replace(/\s+/g, " ").trim();
    return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat;
  }
  if (attachmentName) return `📎 ${attachmentName}`;
  return "";
}

/** Teacher owns the class, or the caller is an active enrolled student. */
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

/**
 * Hard-delete this group's expired messages (older than the TTL) and their
 * storage attachments. Best-effort and idempotent — runs lazily whenever the
 * group is read, so no background job is required.
 */
async function sweepExpiredMessages(groupId: string, cutoff: string) {
  const { data: expired, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, attachment_path")
    .eq("group_id", groupId)
    .lt("created_at", cutoff);
  if (error || !expired || expired.length === 0) return;

  const paths = expired
    .map((m) => m.attachment_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).remove(paths);
  }
  await supabaseAdmin.from("chat_messages").delete().in(
    "id",
    expired.map((m) => m.id)
  );
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id, groupId } = await params;
    await assertCanAccessClassChat(id, user);
    await getChatGroupOrThrow(groupId, id);

    // Messages expire after the TTL: purge the old ones, then only return
    // (and thus only ever show) those still within the window.
    const cutoff = chatMessageCutoffIso();
    await sweepExpiredMessages(groupId, cutoff);

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("group_id", groupId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return apiSuccess("Messages retrieved", { messages: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:message");
    const { id, groupId } = await params;
    await assertCanAccessClassChat(id, user);
    await getChatGroupOrThrow(groupId, id);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ValidationError("Request body must be multipart/form-data");
    }

    const rawBody = formData.get("body");
    const body = typeof rawBody === "string" && rawBody.trim().length > 0 ? rawBody.trim() : null;

    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;
    if (!body && !hasFile) {
      throw new ValidationError("A message must include text, a file, or both");
    }

    // Optional reply target — snapshot its sender/preview so the quote survives
    // even if the original is later deleted or expires.
    let replyToId: string | null = null;
    let replyToSender: string | null = null;
    let replyToPreview: string | null = null;
    const rawReplyTo = formData.get("replyToId");
    if (typeof rawReplyTo === "string" && rawReplyTo.trim().length > 0) {
      const { data: target } = await supabaseAdmin
        .from("chat_messages")
        .select("id, group_id, body, attachment_name, sender:users(name)")
        .eq("id", rawReplyTo.trim())
        .maybeSingle();
      if (target && target.group_id === groupId) {
        const targetSender = target.sender as { name: string } | { name: string }[] | null;
        const senderName = Array.isArray(targetSender)
          ? targetSender[0]?.name
          : targetSender?.name;
        replyToId = target.id;
        replyToSender = senderName ?? null;
        replyToPreview = messagePreview(target.body, target.attachment_name);
      }
    }

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMime: string | null = null;
    let attachmentSize: number | null = null;

    if (hasFile) {
      const upload = file as File;
      if (upload.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
        throw new ValidationError(
          `File exceeds the ${MAX_CHAT_ATTACHMENT_SIZE_BYTES / (1024 * 1024)}MB limit`
        );
      }
      attachmentPath = buildChatAttachmentPath(id, groupId, upload.name);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .upload(attachmentPath, upload, { contentType: upload.type || undefined });
      if (uploadError) throw uploadError;
      attachmentName = upload.name;
      attachmentMime = upload.type || null;
      attachmentSize = upload.size;
    }

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        group_id: groupId,
        class_id: id,
        sender_id: user.userId,
        body,
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
        attachment_mime: attachmentMime,
        attachment_size: attachmentSize,
        reply_to_id: replyToId,
        reply_to_sender: replyToSender,
        reply_to_preview: replyToPreview,
      })
      .select(MESSAGE_SELECT)
      .single();
    if (error) {
      // Insert failed after the upload succeeded — don't leave an orphaned file.
      if (attachmentPath) {
        await supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([attachmentPath]);
      }
      throw error;
    }

    return apiSuccess("Message sent", { message: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
