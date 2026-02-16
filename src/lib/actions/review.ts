"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(
  courseId: string,
  courseSlug: string,
  rating: number,
  comment: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (rating < 1 || rating > 5) return { error: "評価は1〜5の間で指定してください" };

  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      course_id: courseId,
      rating,
      comment: comment.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_id" }
  );

  if (error) {
    console.error("submitReview error:", error);
    return { error: "レビューの投稿に失敗しました" };
  }

  revalidatePath(`/courses/${courseSlug}`);
  return { error: null };
}

export async function deleteReview(reviewId: string, courseSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteReview error:", error);
    return { error: "レビューの削除に失敗しました" };
  }

  revalidatePath(`/courses/${courseSlug}`);
  return { error: null };
}
