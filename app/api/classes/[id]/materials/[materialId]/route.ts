import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError } from "@/lib/authorize";
import { assertOwnsClass, getClassOrThrow } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MATERIALS_BUCKET } from "@/lib/storage";

type Params = { params: Promise<{ id: string; materialId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "material:manage");
    const { id, materialId } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const { data: material, error: fetchError } = await supabaseAdmin
      .from("materials")
      .select("storage_path")
      .eq("id", materialId)
      .eq("class_id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!material) throw new NotFoundError("Material not found for this class");

    const { error: deleteError } = await supabaseAdmin
      .from("materials")
      .delete()
      .eq("id", materialId);
    if (deleteError) throw deleteError;

    await supabaseAdmin.storage.from(MATERIALS_BUCKET).remove([material.storage_path]);

    return apiSuccess("Study material deleted");
  } catch (error) {
    return toErrorResponse(error);
  }
}
