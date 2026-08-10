import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-response";
import { authenticate, NotFoundError, ValidationError } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .select("class_id, attachment_path, attachment_name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!message) throw new NotFoundError("Message not found");
    if (!message.attachment_path) throw new ValidationError("This message has no attachment");

    const klass = await getClassOrThrow(message.class_id);
    if (user.role === "teacher") {
      assertOwnsClass(klass, user);
    } else {
      assertEnrolled(await getEnrollment(message.class_id, user.userId));
    }

    // `?download=1` forces a save (content-disposition: attachment); otherwise
    // the file is served inline so the browser can preview it (PDF, image, …).
    const forceDownload = request.nextUrl.searchParams.has("download");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .createSignedUrl(
        message.attachment_path,
        60,
        forceDownload ? { download: message.attachment_name ?? true } : undefined
      );
    if (signError || !signed) throw signError ?? new Error("Failed to create signed URL");

    return NextResponse.redirect(signed.signedUrl, 307);
  } catch (error) {
    return toErrorResponse(error);
  }
}
