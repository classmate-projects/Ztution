import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, NotFoundError, requirePermission, ValidationError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
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

/** Toggle one emoji reaction from the current user on a message. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:message");
    const { id, groupId, messageId } = await params;
    await assertCanAccessClassChat(id, user);

    const bodyJson = await readJsonBody<{ emoji?: unknown }>(request);
    const emoji = typeof bodyJson.emoji === "string" ? bodyJson.emoji.trim() : "";
    // Keep it to a single short emoji token; guards against arbitrary text.
    if (emoji.length === 0 || emoji.length > 16) {
      throw new ValidationError("'emoji' is required");
    }

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, group_id")
      .eq("id", messageId)
      .maybeSingle();
    if (error) throw error;
    if (!message || message.group_id !== groupId) throw new NotFoundError("Message not found");

    const { data: existing } = await supabaseAdmin
      .from("chat_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.userId)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      const { error: delError } = await supabaseAdmin
        .from("chat_reactions")
        .delete()
        .eq("id", existing.id);
      if (delError) throw delError;
      return apiSuccess("Reaction removed", { added: false });
    }

    const { error: insError } = await supabaseAdmin
      .from("chat_reactions")
      .insert({ message_id: messageId, user_id: user.userId, emoji });
    if (insError) throw insError;
    return apiSuccess("Reaction added", { added: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
