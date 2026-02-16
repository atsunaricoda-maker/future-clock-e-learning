"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { issueCertificate } from "@/lib/actions/certificate";
import { createNotification } from "@/lib/actions/notification";
import { sendEnrollmentEmail } from "@/lib/actions/email";
import { checkPrerequisites } from "@/lib/actions/prerequisite";

export async function enrollInCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Check prerequisites before enrollment
  const prereqCheck = await checkPrerequisites(user.id, courseId);
  if (!prereqCheck.met) {
    const courseNames = prereqCheck.unmetPrerequisites
      .map((p) => `「${p.title}」`)
      .join("、");
    return {
      error: `前提条件を満たしていません。以下のコースを修了してください: ${courseNames}`,
    };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: courseId });

  if (error) {
    if (error.code === "23505") return { error: "すでに登録済みです" };
    console.error("enrollInCourse error:", error);
    return { error: "登録に失敗しました" };
  }

  // Fetch course title and user info for notification/email
  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  const courseTitle = course?.title ?? "コース";

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  await createNotification({
    userId: user.id,
    type: "enrollment",
    title: "受講登録完了",
    message: `「${courseTitle}」への受講登録が完了しました。`,
    relatedUrl: "/my-courses",
  });

  sendEnrollmentEmail({
    to: profile?.email ?? user.email!,
    userName: profile?.full_name ?? "受講生",
    courseTitle,
  });

  revalidatePath("/my-courses");
  revalidatePath("/courses");
  return { success: true };
}

export async function markLessonComplete(lessonId: string, courseSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Upsert lesson_progress
  const { error: progressError } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        status: "completed" as const,
        completed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );

  if (progressError) {
    console.error("markLessonComplete error:", progressError);
    return { error: "進捗の更新に失敗しました" };
  }

  // Get the lesson's section -> course to update enrollment progress
  const { data: lesson } = await supabase
    .from("lessons")
    .select("title, section_id, sections(course_id)")
    .eq("id", lessonId)
    .single();

  if (lesson) {
    const courseId = (lesson.sections as unknown as { course_id: string })?.course_id;
    if (courseId) {
      await updateEnrollmentProgress(user.id, courseId);
    }
  }

  await createNotification({
    userId: user.id,
    type: "lesson_complete",
    title: "レッスン完了",
    message: `「${lesson?.title ?? "レッスン"}」を完了しました。`,
    relatedUrl: `/courses/${courseSlug}/learn`,
  });

  revalidatePath(`/courses/${courseSlug}/learn`);
  revalidatePath("/my-courses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateVideoPosition(
  lessonId: string,
  positionSeconds: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        video_position_seconds: positionSeconds,
        status: "in_progress" as const,
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );

  if (error) {
    console.error("updateVideoPosition error:", error);
    return { error: "再生位置の保存に失敗しました" };
  }

  return { success: true };
}

// Helper: recalculate enrollment progress_percentage
async function updateEnrollmentProgress(userId: string, courseId: string) {
  const supabase = await createClient();

  // Count total lessons in the course
  const { count: totalLessons } = await supabase
    .from("lessons")
    .select("id, sections!inner(course_id)", { count: "exact", head: true })
    .eq("sections.course_id", courseId);

  // Count completed lessons
  const { count: completedLessons } = await supabase
    .from("lesson_progress")
    .select(
      "id, lessons!inner(section_id, sections!inner(course_id))",
      { count: "exact", head: true }
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("lessons.sections.course_id", courseId);

  const percentage =
    totalLessons && totalLessons > 0
      ? Math.round(((completedLessons || 0) / totalLessons) * 100 * 100) / 100
      : 0;

  const completedAt =
    percentage >= 100 ? new Date().toISOString() : null;

  await supabase
    .from("enrollments")
    .update({
      progress_percentage: percentage,
      completed_at: completedAt,
    })
    .eq("user_id", userId)
    .eq("course_id", courseId);

  // Auto-issue certificate when course is completed
  if (percentage >= 100) {
    await issueCertificate(userId, courseId);
    revalidatePath("/certificates");
  }
}
