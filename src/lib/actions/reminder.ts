"use server";

import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "./email";

interface InactiveEnrollment {
  userId: string;
  email: string;
  fullName: string;
  courseTitle: string;
  progressPercentage: number;
  enrolledAt: string;
}

export async function getInactiveEnrollments(
  daysInactive: number = 7
): Promise<{ data: InactiveEnrollment[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "認証が必要です" };

  const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString();

  // Get enrollments that are not completed and enrolled before the cutoff
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("user_id, course_id, progress_percentage, enrolled_at, users(email, full_name), courses(title)")
    .is("completed_at", null)
    .lt("enrolled_at", cutoff)
    .lt("progress_percentage", 100)
    .order("progress_percentage", { ascending: true });

  if (error) {
    console.error("getInactiveEnrollments error:", error);
    return { data: [], error: "データの取得に失敗しました" };
  }

  type EnrollmentRow = {
    user_id: string;
    course_id: string;
    progress_percentage: number;
    enrolled_at: string;
    users: { email: string; full_name: string } | null;
    courses: { title: string } | null;
  };

  const results: InactiveEnrollment[] = ((enrollments ?? []) as unknown as EnrollmentRow[])
    .filter((e) => e.users && e.courses)
    .map((e) => ({
      userId: e.user_id,
      email: e.users!.email,
      fullName: e.users!.full_name ?? "受講生",
      courseTitle: e.courses!.title,
      progressPercentage: Number(e.progress_percentage),
      enrolledAt: e.enrolled_at,
    }));

  return { data: results, error: null };
}

export async function sendBulkReminders(
  targets: { email: string; userName: string; courseTitle: string; progressPercentage: number }[]
): Promise<{ sent: number; errors: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sent: 0, errors: 0 };

  let sent = 0;
  let errors = 0;

  for (const target of targets) {
    try {
      await sendReminderEmail({
        to: target.email,
        userName: target.userName,
        courseTitle: target.courseTitle,
        progressPercentage: target.progressPercentage,
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return { sent, errors };
}
