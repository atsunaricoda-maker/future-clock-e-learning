import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { courseId } = await request.json();
  if (!courseId) {
    return NextResponse.json(
      { error: "courseId は必須です" },
      { status: 400 }
    );
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, price")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json(
      { error: "コースが見つかりません" },
      { status: 404 }
    );
  }

  if (!course.price || course.price <= 0) {
    return NextResponse.json(
      { error: "このコースは無料です" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: course.title,
          },
          unit_amount: course.price,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${appUrl}/courses/${course.slug}?payment=success`,
    cancel_url: `${appUrl}/courses/${course.slug}?payment=cancel`,
    metadata: {
      courseId: course.id,
      userId: user.id,
    },
  });

  // purchases レコード作成（pending）
  const adminClient = createAdminClient();
  await adminClient.from("purchases").insert({
    user_id: user.id,
    course_id: courseId,
    amount: course.price,
    status: "pending",
    payment_method: "stripe",
    stripe_session_id: session.id,
  });

  return NextResponse.json({ url: session.url });
}
