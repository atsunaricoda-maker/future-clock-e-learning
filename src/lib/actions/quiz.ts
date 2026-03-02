"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markLessonComplete } from "@/lib/actions/enrollment";
import { createNotification } from "@/lib/actions/notification";
import { quizFormSchema, questionFormSchema } from "@/lib/validations/quiz";
import type { QuizFormValues, QuestionFormValues } from "@/lib/validations/quiz";

// ============================================
// QUIZ CRUD (Admin)
// ============================================

export async function createQuiz(lessonId: string, courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Check if quiz already exists for this lesson
  const { data: existing } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .single();

  if (existing) return { data: existing };

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      lesson_id: lessonId,
      pass_threshold: 70,
      shuffle_questions: false,
      show_correct_answers: true,
    })
    .select()
    .single();

  if (error) {
    console.error("createQuiz error:", error);
    if (error.code === "23505") {
      // UNIQUE constraint — quiz already exists, fetch it
      const { data: existingQuiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("lesson_id", lessonId)
        .single();
      if (existingQuiz) return { data: existingQuiz };
    }
    return { error: "クイズの作成に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function updateQuiz(
  quizId: string,
  courseId: string,
  values: QuizFormValues
) {
  const parsed = quizFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data, error } = await supabase
    .from("quizzes")
    .update({
      pass_threshold: values.pass_threshold,
      time_limit_seconds: values.time_limit_seconds ?? null,
      max_attempts: values.max_attempts ?? null,
      shuffle_questions: values.shuffle_questions,
      show_correct_answers: values.show_correct_answers,
    })
    .eq("id", quizId)
    .select()
    .single();

  if (error) {
    console.error("updateQuiz error:", error);
    return { error: "クイズの更新に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function deleteQuiz(quizId: string, courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    console.error("deleteQuiz error:", error);
    return { error: "クイズの削除に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

// ============================================
// QUESTION CRUD (Admin)
// ============================================

export async function createQuestion(
  quizId: string,
  courseId: string,
  values: QuestionFormValues
) {
  const parsed = questionFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Get max order_index
  const { data: existing } = await supabase
    .from("questions")
    .select("order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from("questions")
    .insert({
      quiz_id: quizId,
      type: values.type,
      text: values.text,
      options: values.options,
      correct_answer: { id: values.correct_answer_id },
      explanation: values.explanation || null,
      points: values.points,
      order_index: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("createQuestion error:", error);
    return { error: "問題の作成に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function updateQuestion(
  questionId: string,
  courseId: string,
  values: QuestionFormValues
) {
  const parsed = questionFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data, error } = await supabase
    .from("questions")
    .update({
      type: values.type,
      text: values.text,
      options: values.options,
      correct_answer: { id: values.correct_answer_id },
      explanation: values.explanation || null,
      points: values.points,
    })
    .eq("id", questionId)
    .select()
    .single();

  if (error) {
    console.error("updateQuestion error:", error);
    return { error: "問題の更新に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { data };
}

export async function deleteQuestion(questionId: string, courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    console.error("deleteQuestion error:", error);
    return { error: "問題の削除に失敗しました" };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function reorderQuestions(
  quizId: string,
  courseId: string,
  orderedIds: string[]
) {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("questions")
      .update({ order_index: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

// ============================================
// QUIZ ATTEMPT (Student)
// ============================================

export async function submitQuizAttempt(
  quizId: string,
  courseSlug: string,
  answers: Record<string, string>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Fetch quiz with its lesson
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*, lessons(id, section_id)")
    .eq("id", quizId)
    .single();

  if (!quiz) return { error: "クイズが見つかりません" };

  // Check max attempts
  if (quiz.max_attempts) {
    const { count } = await supabase
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("quiz_id", quizId);

    if (count !== null && count >= quiz.max_attempts) {
      return { error: "最大受験回数に達しました" };
    }
  }

  // Fetch questions for scoring
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");

  if (!questions || questions.length === 0) {
    return { error: "問題が設定されていません" };
  }

  // Score the quiz
  let earnedPoints = 0;
  let totalPoints = 0;

  for (const question of questions) {
    totalPoints += question.points;
    const userAnswer = answers[question.id];
    const correctAnswer = (question.correct_answer as { id: string }).id;

    if (userAnswer === correctAnswer) {
      earnedPoints += question.points;
    }
  }

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0;
  const passed = score >= quiz.pass_threshold;

  // Insert quiz attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score,
      passed,
      answers,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (attemptError) {
    console.error("submitQuizAttempt error:", attemptError);
    return { error: "回答の保存に失敗しました" };
  }

  await createNotification({
    userId: user.id,
    type: "quiz_result",
    title: passed ? "クイズ合格" : "クイズ不合格",
    message: passed
      ? `クイズに合格しました！（スコア: ${score}%）`
      : `クイズに不合格でした。（スコア: ${score}%）再チャレンジしましょう。`,
    relatedUrl: `/courses/${courseSlug}/learn`,
  });

  // If passed, mark lesson as complete
  const lesson = quiz.lessons as unknown as {
    id: string;
    section_id: string;
  } | null;

  if (passed && lesson) {
    await markLessonComplete(lesson.id, courseSlug);
  }

  return {
    data: {
      attemptId: attempt.id,
      score,
      passed,
      earnedPoints,
      totalPoints,
    },
  };
}
