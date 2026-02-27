"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notification";
import { sendEnrollmentEmail } from "@/lib/actions/email";
import type { PurchaseStatus } from "@/types/database";

// NOTE: Stripe Checkout Session creation is handled by the API route
// at /api/stripe/checkout (not as a Server Action) to avoid duplication.

export async function createBankTransferPurchase(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, price")
    .eq("id", courseId)
    .single();

  if (!course) return { error: "コースが見つかりません" };
  if (!course.price || course.price <= 0)
    return { error: "このコースは無料です" };

  // 既に購入済み or pending か確認
  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("status", ["completed", "pending"])
    .maybeSingle();

  if (existing?.status === "completed") return { error: "すでに購入済みです" };
  if (existing?.status === "pending")
    return { error: "振込確認待ちの申し込みがあります" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("purchases").insert({
    user_id: user.id,
    course_id: courseId,
    amount: course.price,
    status: "pending" as PurchaseStatus,
    payment_method: "bank_transfer",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "振込確認待ちの申し込みがすでにあります" };
    }
    console.error("createBankTransferPurchase error:", error);
    return { error: "申し込みに失敗しました" };
  }

  await createNotification({
    userId: user.id,
    type: "enrollment",
    title: "銀行振込申し込み受付",
    message: `「${course.title}」の銀行振込申し込みを受け付けました。入金確認後に受講可能になります。`,
    relatedUrl: "/my-courses",
  });

  revalidatePath("/my-courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function confirmBankTransferPurchase(purchaseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // 管理者チェック
  const { data: adminUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminUser?.role !== "admin") return { error: "権限がありません" };

  const adminClient = createAdminClient();

  // 購入情報取得
  const { data: purchase } = await adminClient
    .from("purchases")
    .select("*, courses(title, slug)")
    .eq("id", purchaseId)
    .single();

  if (!purchase) return { error: "購入情報が見つかりません" };
  if (purchase.status !== "pending")
    return { error: "この購入は確認待ちではありません" };

  // アトミックなステータス遷移（pending → completed のみ成功）
  const { data: updated, error: updateError } = await adminClient
    .from("purchases")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", purchaseId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("confirmBankTransferPurchase error:", updateError);
    return { error: "すでに処理済みか、確認処理に失敗しました" };
  }

  // enrollment 自動作成（重複時は無視）
  await adminClient.from("enrollments").upsert(
    { user_id: purchase.user_id, course_id: purchase.course_id },
    { onConflict: "user_id,course_id" }
  );

  const courseData = purchase.courses as unknown as {
    title: string;
    slug: string;
  };

  // 購入完了通知
  await createNotification({
    userId: purchase.user_id,
    type: "enrollment",
    title: "受講登録完了",
    message: `「${courseData?.title ?? "コース"}」への受講登録が完了しました。`,
    relatedUrl: "/my-courses",
  });

  // ユーザー情報取得してメール送信
  const { data: profile } = await adminClient
    .from("users")
    .select("full_name, email")
    .eq("id", purchase.user_id)
    .single();

  if (profile?.email) {
    sendEnrollmentEmail({
      to: profile.email,
      userName: profile.full_name ?? "受講生",
      courseTitle: courseData?.title ?? "コース",
    }).catch((err: unknown) =>
      console.error("Failed to send enrollment email:", err)
    );
  }

  revalidatePath("/admin/purchases");
  revalidatePath("/my-courses");
  return { success: true };
}

export async function getUserPurchaseStatus(
  userId: string,
  courseId: string
): Promise<PurchaseStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["completed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.status as PurchaseStatus) ?? null;
}
