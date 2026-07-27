import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, ValidationError } from "@/lib/authorize";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "billing:manage");

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile?.stripe_customer_id) {
      throw new ValidationError("No billing account found yet — subscribe first");
    }

    const origin = request.nextUrl.origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return apiSuccess("Portal session created", { url: portalSession.url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
