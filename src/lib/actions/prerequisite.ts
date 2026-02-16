"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Get prerequisite courses for a given course
 */
export async function getPrerequisites(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_prerequisites")
    .select("prerequisite_course_id, courses!course_prerequisites_prerequisite_course_id_fkey(id, title, slug)")
    .eq("course_id", courseId);

  if (error) {
    console.error("getPrerequisites error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const course = row.courses as unknown as { id: string; title: string; slug: string } | null;
    return {
      id: course?.id ?? row.prerequisite_course_id,
      title: course?.title ?? "不明",
      slug: course?.slug ?? "",
    };
  });
}

/**
 * Update prerequisites for a course (replace all)
 */
export async function updatePrerequisites(
  courseId: string,
  prerequisiteCourseIds: string[]
) {
  const supabase = await createClient();

  // Check admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "管理者権限が必要です" };
  }

  // Delete existing prerequisites
  const { error: deleteError } = await supabase
    .from("course_prerequisites")
    .delete()
    .eq("course_id", courseId);

  if (deleteError) {
    console.error("deletePrerequisites error:", deleteError);
    return { error: "前提条件の更新に失敗しました" };
  }

  // Insert new prerequisites
  if (prerequisiteCourseIds.length > 0) {
    const rows = prerequisiteCourseIds.map((prereqId) => ({
      course_id: courseId,
      prerequisite_course_id: prereqId,
    }));

    const { error: insertError } = await supabase
      .from("course_prerequisites")
      .insert(rows);

    if (insertError) {
      console.error("insertPrerequisites error:", insertError);
      return { error: "前提条件の設定に失敗しました" };
    }
  }

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses");
  return { success: true };
}

/**
 * Check if user has completed all prerequisite courses
 * Returns: { met: true } or { met: false, unmetPrerequisites: [...] }
 */
export async function checkPrerequisites(
  userId: string,
  courseId: string
) {
  const supabase = await createClient();

  // Get prerequisites for this course
  const { data: prerequisites } = await supabase
    .from("course_prerequisites")
    .select("prerequisite_course_id, courses!course_prerequisites_prerequisite_course_id_fkey(id, title, slug)")
    .eq("course_id", courseId);

  if (!prerequisites || prerequisites.length === 0) {
    return { met: true as const, unmetPrerequisites: [] };
  }

  // Get user's completed enrollments
  const prereqIds = prerequisites.map((p) => p.prerequisite_course_id);
  const { data: completedEnrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress_percentage")
    .eq("user_id", userId)
    .in("course_id", prereqIds);

  const completedCourseIds = new Set(
    (completedEnrollments ?? [])
      .filter((e) => Number(e.progress_percentage) >= 100)
      .map((e) => e.course_id)
  );

  const unmetPrerequisites = prerequisites
    .filter((p) => !completedCourseIds.has(p.prerequisite_course_id))
    .map((p) => {
      const course = p.courses as unknown as { id: string; title: string; slug: string } | null;
      return {
        id: course?.id ?? p.prerequisite_course_id,
        title: course?.title ?? "不明",
        slug: course?.slug ?? "",
      };
    });

  return {
    met: unmetPrerequisites.length === 0,
    unmetPrerequisites,
  };
}
