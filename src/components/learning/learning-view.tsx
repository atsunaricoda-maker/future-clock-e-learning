"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "@/components/learning/video-player";
import { QuizView } from "@/components/learning/quiz-view";
import { LessonNavigation } from "@/components/learning/lesson-navigation";
import { markLessonComplete, updateVideoPosition } from "@/lib/actions/enrollment";
import { isSupabaseVideoUrl, isDirectVideoUrl } from "@/lib/video-utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Menu,
  X,
  FileText,
} from "lucide-react";
import type { Course, Section, Lesson, LessonProgress, Quiz, Question, QuizAttempt } from "@/types/database";

type SectionWithLessons = Section & { lessons: Lesson[] };

/** 視聴完了に必要な最低視聴率（%） */
const REQUIRED_WATCH_PERCENT = 80;

interface LearningViewProps {
  course: Course;
  sections: SectionWithLessons[];
  currentLesson: Lesson;
  currentLessonIndex: number;
  totalLessons: number;
  progressMap: Record<string, LessonProgress>;
  progressPercentage: number;
  prevLessonId: string | null;
  prevLessonTitle: string | null;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  quiz?: Quiz | null;
  quizQuestions?: Question[];
  quizAttempts?: QuizAttempt[];
}

/**
 * 直接再生可能な動画URL（Supabase Storage等）かどうか判定
 */
function isDirectVideo(url: string | null): boolean {
  if (!url) return false;
  return isSupabaseVideoUrl(url) || isDirectVideoUrl(url);
}

export function LearningView({
  course,
  sections,
  currentLesson,
  currentLessonIndex,
  totalLessons,
  progressMap,
  progressPercentage,
  prevLessonId,
  prevLessonTitle,
  nextLessonId,
  nextLessonTitle,
  quiz,
  quizQuestions = [],
  quizAttempts = [],
}: LearningViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isCompleted = progressMap[currentLesson.id]?.status === "completed";

  // 視聴率追跡（Supabase/直接動画のみ有効）
  const [watchedPercent, setWatchedPercent] = useState(() => {
    // 既に完了済みなら100%
    if (isCompleted) return 100;
    // 前回のmax_watched_secondsから計算
    const progress = progressMap[currentLesson.id];
    if (progress?.max_watched_seconds && currentLesson.duration_seconds) {
      return Math.round(
        (progress.max_watched_seconds / currentLesson.duration_seconds) * 100
      );
    }
    return 0;
  });

  // 動画が直接再生タイプか（シーク制限対象か）
  const isDirectVideoLesson =
    currentLesson.type === "video" && isDirectVideo(currentLesson.content_url);

  // 完了ボタンが押せる条件
  const canComplete =
    isCompleted ||
    !isDirectVideoLesson || // 直接動画以外（YouTube/Vimeo/document）は常に有効
    watchedPercent >= REQUIRED_WATCH_PERCENT;

  // 視聴位置のサーバー保存コールバック
  const handlePositionChange = useCallback(
    (currentSeconds: number, maxWatchedSeconds: number) => {
      updateVideoPosition(
        currentLesson.id,
        Math.round(currentSeconds),
        Math.round(maxWatchedSeconds)
      );
    },
    [currentLesson.id]
  );

  const handleMarkComplete = async () => {
    setLoading(true);
    const result = await markLessonComplete(currentLesson.id, course.slug);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("レッスンを完了しました！");
      router.refresh();
      // Auto navigate to next lesson
      if (nextLessonId) {
        router.push(`/courses/${course.slug}/learn/${nextLessonId}`);
      }
    }
    setLoading(false);
  };

  // 前回の再生位置・最大視聴位置を取得
  const currentProgress = progressMap[currentLesson.id];
  const initialPosition = currentProgress?.video_position_seconds ?? 0;
  const initialMaxWatched = currentProgress?.max_watched_seconds ?? 0;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${course.slug}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="hidden sm:block">
            <p className="text-sm font-medium line-clamp-1">{course.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-muted-foreground">
            レッスン {currentLessonIndex + 1}/{totalLessons}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{Math.round(progressPercentage)}% 完了</span>
            <Progress value={progressPercentage} className="w-32 h-2" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
            {/* Lesson title */}
            <h1 className="mb-4 text-xl font-semibold">{currentLesson.title}</h1>

            {/* Lesson content */}
            {currentLesson.type === "video" && currentLesson.content_url && (
              <VideoPlayer
                url={currentLesson.content_url}
                title={currentLesson.title}
                restrictSeek={isDirectVideoLesson}
                onProgressUpdate={setWatchedPercent}
                onPositionChange={handlePositionChange}
                initialPosition={initialPosition}
                initialMaxWatched={initialMaxWatched}
              />
            )}

            {currentLesson.type === "document" && currentLesson.content_url && (
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    ドキュメント
                  </span>
                </div>
                <a
                  href={currentLesson.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ドキュメントを開く
                </a>
              </div>
            )}

            {currentLesson.type === "quiz" && quiz && (
              <QuizView
                quiz={quiz}
                questions={quizQuestions}
                attempts={quizAttempts}
                courseSlug={course.slug}
                isLessonCompleted={isCompleted}
              />
            )}

            {/* Description */}
            {currentLesson.description && (
              <div className="mt-6 rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium">レッスン説明</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentLesson.description}
                </p>
              </div>
            )}
          </div>

          {/* Bottom navigation */}
          <div className="shrink-0 border-t p-4">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {prevLessonId && (
                  <Button variant="outline" asChild className="max-w-full">
                    <Link
                      href={`/courses/${course.slug}/learn/${prevLessonId}`}
                      className="flex items-center"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4 shrink-0" />
                      <span className="truncate hidden sm:inline">
                        {prevLessonTitle}
                      </span>
                      <span className="sm:hidden">前へ</span>
                    </Link>
                  </Button>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                {currentLesson.type === "quiz" ? (
                  isCompleted ? (
                    <Button variant="outline" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      合格済み
                    </Button>
                  ) : null
                ) : !isCompleted ? (
                  <>
                    <Button
                      onClick={handleMarkComplete}
                      disabled={loading || !canComplete}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {loading ? "処理中..." : "完了にする"}
                    </Button>
                    {/* 視聴率が足りない場合のメッセージ */}
                    {isDirectVideoLesson &&
                      watchedPercent < REQUIRED_WATCH_PERCENT && (
                        <p className="text-xs text-muted-foreground">
                          動画を{REQUIRED_WATCH_PERCENT}%以上視聴してください
                          （現在: {watchedPercent}%）
                        </p>
                      )}
                  </>
                ) : (
                  <Button variant="outline" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    完了済み
                  </Button>
                )}
              </div>

              <div className="min-w-0 flex-1 flex justify-end">
                {nextLessonId && (
                  <Button variant="outline" asChild className="max-w-full">
                    <Link
                      href={`/courses/${course.slug}/learn/${nextLessonId}`}
                      className="flex items-center"
                    >
                      <span className="truncate hidden sm:inline">
                        {nextLessonTitle}
                      </span>
                      <span className="sm:hidden">次へ</span>
                      <ChevronRight className="ml-1 h-4 w-4 shrink-0" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } w-80 shrink-0 overflow-y-auto border-l bg-muted/20 p-4 lg:block`}
        >
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            カリキュラム
          </h2>
          <LessonNavigation
            courseSlug={course.slug}
            sections={sections}
            currentLessonId={currentLesson.id}
            progressMap={progressMap}
          />
        </aside>
      </div>
    </div>
  );
}
