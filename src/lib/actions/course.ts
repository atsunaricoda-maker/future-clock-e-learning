"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import type { CourseFormValues, SectionFormValues, LessonFormValues } from "@/lib/validations/course";

// ============================================
// COURSE ACTIONS
// ============================================

export async function createCourse(values: CourseFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const slug = generateSlug(values.title);
  const tags = values.tags
    ? values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: values.title,
      slug,
      description: values.description || null,
      short_description: values.short_description || null,
      thumbnail_url: values.thumbnail_url || null,
      status: values.status,
      is_public: values.is_public,
      estimated_duration_min: values.estimated_duration_min || null,
      difficulty_level: values.difficulty_level || null,
      category: values.category || null,
      tags: tags.length > 0 ? tags : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("createCourse error:", error);
    return { error: "コースの作成に失敗しました" };
  }

  revalidatePath("/admin/courses");
  return { data };
}

export async function updateCourse(courseId: string, values: CourseFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const tags = values.tags
    ? values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const { data, error } = await supabase
    .from("courses")
    .update({
      title: values.title,
      description: values.description || null,
      short_description: values.short_description || null,
      thumbnail_url: values.thumbnail_url || null,
      status: values.status,
      is_public: values.is_public,
      estimated_duration_min: values.estimated_duration_min || null,
      difficulty_level: values.difficulty_level || null,
      category: values.category || null,
      tags: tags.length > 0 ? tags : null,
    })
    .eq("id", courseId)
    .select()
    .single();

  if (error) {
    console.error("updateCourse error:", error);
    return { error: "コースの更新に失敗しました" };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    console.error("deleteCourse error:", error);
    return { error: "コースの削除に失敗しました" };
  }

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function updateCourseStatus(
  courseId: string,
  status: "draft" | "published" | "archived"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", courseId);

  if (error) {
    console.error("updateCourseStatus error:", error);
    return { error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

// ============================================
// SECTION ACTIONS
// ============================================

export async function createSection(courseId: string, values: SectionFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Get max order_index for this course
  const { data: existing } = await supabase
    .from("sections")
    .select("order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from("sections")
    .insert({
      course_id: courseId,
      title: values.title,
      description: values.description || null,
      order_index: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("createSection error:", error);
    return { error: "セクションの作成に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function updateSection(sectionId: string, courseId: string, values: SectionFormValues) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .update({
      title: values.title,
      description: values.description || null,
    })
    .eq("id", sectionId)
    .select()
    .single();

  if (error) {
    console.error("updateSection error:", error);
    return { error: "セクションの更新に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function deleteSection(sectionId: string, courseId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("sections").delete().eq("id", sectionId);

  if (error) {
    console.error("deleteSection error:", error);
    return { error: "セクションの削除に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function reorderSections(courseId: string, orderedIds: string[]) {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("sections")
      .update({ order_index: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

// ============================================
// LESSON ACTIONS
// ============================================

export async function createLesson(sectionId: string, courseId: string, values: LessonFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Get max order_index for this section
  const { data: existing } = await supabase
    .from("lessons")
    .select("order_index")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      section_id: sectionId,
      title: values.title,
      description: values.description || null,
      type: values.type,
      content_url: values.content_url || null,
      duration_seconds: values.duration_seconds || null,
      order_index: nextOrder,
      is_preview: values.is_preview,
    })
    .select()
    .single();

  if (error) {
    console.error("createLesson error:", error);
    return { error: "レッスンの作成に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function updateLesson(lessonId: string, courseId: string, values: LessonFormValues) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .update({
      title: values.title,
      description: values.description || null,
      type: values.type,
      content_url: values.content_url || null,
      duration_seconds: values.duration_seconds || null,
      is_preview: values.is_preview,
    })
    .eq("id", lessonId)
    .select()
    .single();

  if (error) {
    console.error("updateLesson error:", error);
    return { error: "レッスンの更新に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) {
    console.error("deleteLesson error:", error);
    return { error: "レッスンの削除に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function reorderLessons(sectionId: string, courseId: string, orderedIds: string[]) {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("lessons")
      .update({ order_index: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}
