import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Quiz, Question } from "@/types/database";

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Fetch lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (!lesson || lesson.type !== "quiz") notFound();

  // Fetch or create quiz
  let { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();

  if (!quiz) {
    // Auto-create quiz for this lesson
    const { data: newQuiz, error } = await supabase
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
      console.error("Auto-create quiz error:", error);
      notFound();
    }
    quiz = newQuiz;
  }

  // Fetch questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">クイズ設定</h1>
          <p className="text-sm text-muted-foreground">
            {course.title} / {lesson.title}
          </p>
        </div>
      </div>

      <QuizEditor
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lesson.title}
        quiz={quiz as unknown as Quiz}
        questions={(questions || []) as unknown as Question[]}
      />
    </div>
  );
}
