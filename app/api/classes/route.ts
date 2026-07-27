import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission } from "@/lib/authorize";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireString, readJsonBody } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role === "teacher") {
      const { data, error } = await supabaseAdmin
        .from("classes")
        .select("*")
        .eq("teacher_id", user.userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return apiSuccess("Classes retrieved", { classes: data });
    }

    const { data, error } = await supabaseAdmin
      .from("class_students")
      .select("status, joined_at, classes(*)")
      .eq("student_id", user.userId);
    if (error) throw error;
    return apiSuccess("Classes retrieved", { classes: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "class:create");

    const body = await readJsonBody(request);
    const name = requireString(body.name, "name");

    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert({ name, teacher_id: user.userId })
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess("Class created successfully", { class: data }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
