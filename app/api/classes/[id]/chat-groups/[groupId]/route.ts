import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import { assertOwnsClass, getChatGroupOrThrow, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/storage";
import { readJsonBody, requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string; groupId: string }> };

/** Update a chat group's name/description — teacher (class owner) only. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:manage");
    const { id, groupId } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);
    await getChatGroupOrThrow(groupId, id);

    const body = await readJsonBody<{ name?: unknown; description?: unknown }>(request);
    const name = requireString(body.name, "name");
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    const { data, error } = await supabaseAdmin
      .from("chat_groups")
      .update({ name, description })
      .eq("id", groupId)
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Chat group updated", { group: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Delete a chat group — teacher (class owner) only. Removes every shared
 * attachment from Storage first (so nothing is orphaned), then deletes the
 * group row, which cascades to its messages and their reactions.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "chat:manage");
    const { id, groupId } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);
    await getChatGroupOrThrow(groupId, id);

    // Clear this group's attachments from Storage before the rows disappear.
    const { data: files } = await supabaseAdmin
      .from("chat_messages")
      .select("attachment_path")
      .eq("group_id", groupId)
      .not("attachment_path", "is", null);
    const paths = (files ?? [])
      .map((f) => f.attachment_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).remove(paths);
    }

    // FK cascades: chat_groups → chat_messages → chat_reactions.
    const { error } = await supabaseAdmin.from("chat_groups").delete().eq("id", groupId);
    if (error) throw error;

    return apiSuccess("Chat group deleted");
  } catch (error) {
    return toErrorResponse(error);
  }
}
