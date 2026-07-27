import type { NextRequest } from "next/server";
import { apiSuccess, toErrorResponse } from "@/lib/api-response";
import { authenticate, requirePermission, NotFoundError } from "@/lib/authorize";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requirePermission(user, "billing:manage");

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error("Missing STRIPE_PRICE_ID environment variable");

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("email, name, stripe_customer_id")
      .eq("id", user.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new NotFoundError("User not found");

    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.name,
        metadata: { userId: user.userId },
      });
      customerId = customer.id;
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.userId);
      if (updateError) throw updateError;
    }

    const origin = request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
    });

    return apiSuccess("Checkout session created", { url: session.url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
