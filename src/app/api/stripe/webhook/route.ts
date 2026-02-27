import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { courseId, userId } = session.metadata ?? {};

    if (!courseId || !userId) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    const adminClient = createAdminClient();

    // purchases を completed に更新（アトミック: pending → completed のみ成功）
    const { data: updatedPurchase, error: updateError } = await adminClient
      .from("purchases")
      .update({
        status: "completed",
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError || !updatedPurchase) {
      console.error(
        "Failed to update purchase for session:",
        session.id,
        updateError
      );
      return NextResponse.json({ received: true });
    }

    // enrollment 自動作成（重複時は無視）
    await adminClient
      .from("enrollments")
      .upsert(
        { user_id: userId, course_id: courseId },
        { onConflict: "user_id,course_id" }
      );

    // 通知作成
    const { data: course } = await adminClient
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single();

    if (course) {
      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "enrollment",
        title: "購入完了・受講登録完了",
        message: `「${course.title}」の購入が完了し、受講登録されました。`,
        related_url: "/my-courses",
      });
    }
  }

  return NextResponse.json({ received: true });
}
