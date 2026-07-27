import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

// Called directly by Stripe, not by our own users — there is no session
// cookie/bearer token to check. Authenticity instead comes from verifying
// the `stripe-signature` header against STRIPE_WEBHOOK_SECRET below, so this
// route is explicitly excluded from proxy.ts's "require a session" matcher.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription(subscription, session.client_reference_id);
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(subscription, null);
    }
  } catch (err) {
    console.error("Stripe webhook handler failed", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(subscription: Stripe.Subscription, userIdHint: string | null) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];

  let studentId = userIdHint;
  if (!studentId) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    studentId = user?.id ?? null;
  }
  if (!studentId) {
    console.error(`Stripe webhook: no user found for customer ${customerId}`);
    return;
  }

  await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", studentId);

  await supabaseAdmin.from("subscriptions").upsert(
    {
      student_id: studentId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price.id ?? null,
      status: subscription.status,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );
}
