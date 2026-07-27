import { supabaseAdmin } from "./supabase/server";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface SubscriptionStatus {
  active: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscriptionStatus(studentId: string): Promise<SubscriptionStatus> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("student_id", studentId)
    .maybeSingle();

  return {
    active: data ? ACTIVE_STATUSES.has(data.status) : false,
    status: data?.status ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
  };
}
