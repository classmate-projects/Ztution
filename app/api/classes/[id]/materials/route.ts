import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buildMaterialStoragePath, MATERIALS_BUCKET, MAX_MATERIAL_SIZE_BYTES } from "@/lib/storage";
import { requireString } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id } = await params;
    const klass = await getClassOrThrow(id);

    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(id, user.userId));
    }

    const { data, error } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return apiSuccess("Study materials retrieved", { materials: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "material:upload");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ValidationError("Request body must be multipart/form-data");
    }

    const title = requireString(formData.get("title"), "title");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("'file' is required");
    }
    if (file.size > MAX_MATERIAL_SIZE_BYTES) {
      throw new ValidationError(
        `File exceeds the ${MAX_MATERIAL_SIZE_BYTES / (1024 * 1024)}MB limit`
      );
    }

    const storagePath = buildMaterialStoragePath(id, file.name);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;

    const { data, error } = await supabaseAdmin
      .from("materials")
      .insert({
        class_id: id,
        teacher_id: user.userId,
        title,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select("*")
      .single();
    if (error) {
      // Insert failed after the upload succeeded — don't leave an orphaned file.
      await supabaseAdmin.storage.from(MATERIALS_BUCKET).remove([storagePath]);
      throw error;
    }

    return apiSuccess("Study material uploaded", { material: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
