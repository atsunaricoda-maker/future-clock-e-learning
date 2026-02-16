import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearningView } from "@/components/learning/learning-view";
import type { Course, Section, Lesson, LessonProgress, Quiz, Question, QuizAttempt } from "@/types/database";

type SectionWithLessons = Section & { lessons: Lesson[] };

export default async function LearningPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!course) notFound();

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .single();

  if (!enrollment) {
    redirect(`/courses/${slug}`);
  }

  // Fetch sections with lessons
  const { data: sections } = await supabase
    .from("sections")
    .select("*, lessons(*)")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true })
    .order("order_index", { referencedTable: "lessons", ascending: true });

  const typedSections: SectionWithLessons[] = (sections || []) as SectionWithLessons[];

  // Find current lesson
  let currentLesson: Lesson | null = null;
  const allLessons: Lesson[] = [];
  for (const section of typedSections) {
    for (const lesson of section.lessons || []) {
      allLessons.push(lesson);
      if (lesson.id === lessonId) {
        currentLesson = lesson;
      }
    }
  }

  if (!currentLesson) notFound();

  // Get prev/next lesson IDs and titles
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  const prevLessonId = prevLesson?.id ?? null;
  const nextLessonId = nextLesson?.id ?? null;

  // Fetch lesson progress for all lessons in this course
  const lessonIds = allLessons.map((l) => l.id);
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  const progressMap: Record<string, LessonProgress> = {};
  for (const p of progressData || []) {
    progressMap[p.lesson_id] = p as unknown as LessonProgress;
  }

  // Fetch quiz data if this is a quiz lesson
  let quiz: Quiz | null = null;
  let quizQuestions: Question[] = [];
  let quizAttempts: QuizAttempt[] = [];

  if (currentLesson.type === "quiz") {
    const { data: quizData } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", currentLesson.id)
      .single();

    if (quizData) {
      quiz = quizData as unknown as Quiz;

      // Fetch questions and attempts in parallel
      const [questionsResult, attemptsResult] = await Promise.all([
        supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", quiz.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("quiz_attempts")
          .select("*")
          .eq("user_id", user.id)
          .eq("quiz_id", quiz.id)
          .order("started_at", { ascending: true }),
      ]);

      quizQuestions = (questionsResult.data || []) as unknown as Question[];
      quizAttempts = (attemptsResult.data || []) as unknown as QuizAttempt[];
    }
  }

  return (
    <LearningView
      course={course as unknown as Course}
      sections={typedSections}
      currentLesson={currentLesson}
      currentLessonIndex={currentIndex}
      totalLessons={allLessons.length}
      progressMap={progressMap}
      progressPercentage={enrollment.progress_percentage}
      prevLessonId={prevLessonId}
      prevLessonTitle={prevLesson?.title ?? null}
      nextLessonId={nextLessonId}
      nextLessonTitle={nextLesson?.title ?? null}
      quiz={quiz}
      quizQuestions={quizQuestions}
      quizAttempts={quizAttempts}
    />
  );
}
