import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import { assertEnrolled, assertOwnsClass, getClassOrThrow, getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireString, optionalMoneyAmount, readJsonBody } from "@/lib/validate";

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

    return apiSuccess("Class retrieved", { class: klass });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "class:update");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const body = await readJsonBody(request);
    const name = requireString(body.name, "name");
    const paymentAmount = optionalMoneyAmount(body.paymentAmount, "paymentAmount");

    const { data, error } = await supabaseAdmin
      .from("classes")
      .update({ name, ...(paymentAmount !== undefined && { payment_amount: paymentAmount }) })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Class updated successfully", { class: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "class:delete");
    const { id } = await params;

    const klass = await getClassOrThrow(id);
    assertOwnsClass(klass, user);

    const { error } = await supabaseAdmin.from("classes").delete().eq("id", id);
    if (error) throw error;

    return apiSuccess("Class deleted successfully");
  } catch (error) {
    return toErrorResponse(error);
  }
}
