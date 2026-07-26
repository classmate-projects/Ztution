import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-response";
import { authenticate, NotFoundError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MATERIALS_BUCKET } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const { data: material, error } = await supabaseAdmin
      .from("materials")
      .select("class_id, storage_path, file_name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!material) throw new NotFoundError("Material not found");

    const klass = await getClassOrThrow(material.class_id);
    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(material.class_id, user.userId));
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .createSignedUrl(material.storage_path, 60, { download: material.file_name });
    if (signError || !signed) throw signError ?? new Error("Failed to create signed URL");

    return NextResponse.redirect(signed.signedUrl, 307);
  } catch (error) {
    return toErrorResponse(error);
  }
}
