"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notification";
import { sendCertificateEmail } from "@/lib/actions/email";

/**
 * Generate a unique certificate number.
 * Format: FC-YYYYMMDD-XXXXXX (random 6 chars)
 */
function generateCertificateNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FC-${y}${m}${d}-${rand}`;
}

/**
 * Issue a certificate for a user who completed a course.
 * Called automatically when enrollment progress reaches 100%.
 * Idempotent: won't create duplicates due to UNIQUE(user_id, course_id).
 */
export async function issueCertificate(userId: string, courseId: string) {
  const supabase = await createClient();

  // Check if certificate already exists
  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (existing) {
    return { data: existing, alreadyExists: true };
  }

  const certificateNumber = generateCertificateNumber();

  // 受講期間を取得
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("enrolled_at, completed_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  // 総受講時間を算出（コース全レッスンの duration_seconds 合計）
  const { data: lessonDurations } = await supabase
    .from("lessons")
    .select("duration_seconds, sections!inner(course_id)")
    .eq("sections.course_id", courseId);

  const totalSeconds = (lessonDurations ?? []).reduce(
    (sum: number, l: { duration_seconds: number | null }) =>
      sum + (l.duration_seconds ?? 0),
    0
  );
  const totalLearningMinutes = Math.round(totalSeconds / 60);

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      user_id: userId,
      course_id: courseId,
      certificate_number: certificateNumber,
      training_start_date: enrollment?.enrolled_at ?? null,
      training_end_date: enrollment?.completed_at ?? new Date().toISOString(),
      total_learning_minutes: totalLearningMinutes || null,
    })
    .select()
    .single();

  if (error) {
    // Handle race condition: another request may have created it
    if (error.code === "23505") {
      const { data: existing2 } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single();
      return { data: existing2, alreadyExists: true };
    }
    console.error("issueCertificate error:", error);
    return { error: "証明書の発行に失敗しました" };
  }

  // Notification + email for new certificate
  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  const { data: certUser } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  const courseTitle = course?.title ?? "コース";

  await createNotification({
    userId,
    type: "certificate",
    title: "修了証発行",
    message: `「${courseTitle}」の修了証が発行されました。`,
    relatedUrl: "/certificates",
  });

  sendCertificateEmail({
    to: certUser?.email ?? "",
    userName: certUser?.full_name ?? "受講生",
    courseTitle,
    certificateNumber,
  });

  return { data };
}
