"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LearningPathInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  difficulty_level?: string;
  estimated_duration_min?: number | null;
  is_published?: boolean;
}

export async function createLearningPath(input: LearningPathInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Generate slug from title
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "-")
    .replace(/^-|-$/g, "")
    || `path-${Date.now()}`;

  const { data, error } = await supabase
    .from("learning_paths")
    .insert({
      ...input,
      slug,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createLearningPath error:", error);
    return { error: "学習パスの作成に失敗しました" };
  }

  revalidatePath("/admin/learning-paths");
  return { success: true, data };
}

export async function updateLearningPath(id: string, input: Partial<LearningPathInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("learning_paths")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateLearningPath error:", error);
    return { error: "学習パスの更新に失敗しました" };
  }

  revalidatePath("/admin/learning-paths");
  revalidatePath("/learning-paths");
  return { success: true };
}

export async function deleteLearningPath(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("learning_paths").delete().eq("id", id);

  if (error) {
    console.error("deleteLearningPath error:", error);
    return { error: "学習パスの削除に失敗しました" };
  }

  revalidatePath("/admin/learning-paths");
  return { success: true };
}

export async function updateLearningPathCourses(
  learningPathId: string,
  courses: { courseId: string; orderIndex: number; isRequired: boolean }[]
) {
  const supabase = await createClient();

  // Delete existing
  const { error: deleteError } = await supabase
    .from("learning_path_courses")
    .delete()
    .eq("learning_path_id", learningPathId);

  if (deleteError) {
    console.error("deleteLearningPathCourses error:", deleteError);
    return { error: "コースの更新に失敗しました" };
  }

  // Insert new
  if (courses.length > 0) {
    const rows = courses.map((c) => ({
      learning_path_id: learningPathId,
      course_id: c.courseId,
      order_index: c.orderIndex,
      is_required: c.isRequired,
    }));

    const { error: insertError } = await supabase
      .from("learning_path_courses")
      .insert(rows);

    if (insertError) {
      console.error("insertLearningPathCourses error:", insertError);
      return { error: "コースの設定に失敗しました" };
    }
  }

  revalidatePath(`/admin/learning-paths`);
  revalidatePath("/learning-paths");
  return { success: true };
}
