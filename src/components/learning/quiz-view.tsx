"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { submitQuizAttempt } from "@/lib/actions/quiz";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import type { Quiz, Question, QuizAttempt } from "@/types/database";

interface QuizViewProps {
  quiz: Quiz;
  questions: Question[];
  attempts: QuizAttempt[];
  courseSlug: string;
  isLessonCompleted: boolean;
}

type Phase = "start" | "taking" | "result";

export function QuizView({
  quiz,
  questions,
  attempts,
  courseSlug,
  isLessonCompleted,
}: QuizViewProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    isLessonCompleted ? "start" : "start"
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Shuffle questions if needed
  const [displayQuestions] = useState(() => {
    if (quiz.shuffle_questions) {
      return [...questions].sort(() => Math.random() - 0.5);
    }
    return questions;
  });

  const canRetake =
    !quiz.max_attempts || attempts.length < quiz.max_attempts;

  // Timer
  useEffect(() => {
    if (phase !== "taking" || !quiz.time_limit_seconds) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time's up — auto submit
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, quiz.time_limit_seconds]);

  // Auto-submit when time runs out
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const result = await submitQuizAttempt(quiz.id, courseSlug, answers);

    if (result.error) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }

    if (result.data) {
      setResult(result.data);
      setPhase("result");
      router.refresh();
    }
    setSubmitting(false);
  }, [submitting, quiz.id, courseSlug, answers, router]);

  useEffect(() => {
    if (timeRemaining === 0 && phase === "taking") {
      handleSubmit();
    }
  }, [timeRemaining, phase, handleSubmit]);

  const handleStartQuiz = () => {
    setPhase("taking");
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    if (quiz.time_limit_seconds) {
      setTimeRemaining(quiz.time_limit_seconds);
    }
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQuestion = displayQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    displayQuestions.length > 0
      ? (answeredCount / displayQuestions.length) * 100
      : 0;

  // ========================================
  // START PHASE
  // ========================================
  if (phase === "start") {
    const bestAttempt = attempts.length > 0
      ? attempts.reduce((best, a) =>
          (a.score ?? 0) > (best.score ?? 0) ? a : best
        )
      : null;
    const hasPassed = attempts.some((a) => a.passed);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              クイズ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-xs text-muted-foreground">問題数</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{quiz.pass_threshold}%</p>
                <p className="text-xs text-muted-foreground">合格基準</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">
                  {quiz.time_limit_seconds
                    ? formatTime(quiz.time_limit_seconds)
                    : "--"}
                </p>
                <p className="text-xs text-muted-foreground">制限時間</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">
                  {quiz.max_attempts ?? "∞"}
                </p>
                <p className="text-xs text-muted-foreground">受験回数上限</p>
              </div>
            </div>

            {/* Past attempts */}
            {attempts.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium">受験履歴</h3>
                <div className="space-y-2">
                  {attempts.map((attempt, i) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        第{i + 1}回
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {attempt.score ?? 0}%
                        </span>
                        {attempt.passed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            合格
                          </Badge>
                        ) : (
                          <Badge variant="destructive">不合格</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {bestAttempt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    最高スコア: {bestAttempt.score ?? 0}%
                  </p>
                )}
              </div>
            )}

            {hasPassed && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
                <Trophy className="h-5 w-5" />
                <p className="text-sm font-medium">
                  このクイズは合格済みです
                </p>
              </div>
            )}

            {questions.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm">
                    問題がまだ設定されていません
                  </p>
                </div>
              </div>
            ) : canRetake ? (
              <Button onClick={handleStartQuiz} className="w-full" size="lg">
                {attempts.length > 0 ? "再受験する" : "クイズを開始"}
              </Button>
            ) : (
              <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm">
                    最大受験回数（{quiz.max_attempts}回）に達しました
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========================================
  // TAKING PHASE
  // ========================================
  if (phase === "taking" && currentQuestion) {
    return (
      <div className="space-y-4">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            問題 {currentIndex + 1} / {displayQuestions.length}
          </span>
          <div className="flex items-center gap-3">
            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  timeRemaining < 60 ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              回答済み: {answeredCount}/{displayQuestions.length}
            </span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />

        {/* Question card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {currentQuestion.type === "multiple_choice"
                  ? "選択式"
                  : "○×式"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentQuestion.points}点
              </span>
            </div>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const isSelected =
                  answers[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() =>
                      handleSelectAnswer(currentQuestion.id, option.id)
                    }
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-sm">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            前の問題
          </Button>

          {currentIndex < displayQuestions.length - 1 ? (
            <Button
              variant="outline"
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(displayQuestions.length - 1, i + 1)
                )
              }
            >
              次の問題
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < displayQuestions.length}
            >
              <Target className="mr-2 h-4 w-4" />
              {submitting ? "採点中..." : "回答を提出"}
            </Button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap gap-2 justify-center">
          {displayQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========================================
  // RESULT PHASE
  // ========================================
  if (phase === "result" && result) {
    return (
      <div className="space-y-6">
        {/* Score card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {result.passed ? (
                <div className="mb-4">
                  <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
                  <h2 className="mt-2 text-2xl font-bold text-green-700">
                    合格！
                  </h2>
                </div>
              ) : (
                <div className="mb-4">
                  <XCircle className="mx-auto h-16 w-16 text-red-400" />
                  <h2 className="mt-2 text-2xl font-bold text-red-700">
                    不合格
                  </h2>
                </div>
              )}

              <div className="mx-auto mb-4 flex max-w-xs items-center justify-center gap-8">
                <div>
                  <p className="text-4xl font-bold">{result.score}%</p>
                  <p className="text-sm text-muted-foreground">スコア</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <p className="text-4xl font-bold">
                    {result.earnedPoints}/{result.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">得点</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                合格基準: {quiz.pass_threshold}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Answer review */}
        {quiz.show_correct_answers && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">解答一覧</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayQuestions.map((question, i) => {
                const userAnswer = answers[question.id];
                const correctAnswer = question.correct_answer?.id;
                const isCorrect = userAnswer === correctAnswer;
                const selectedOption = question.options.find(
                  (o) => o.id === userAnswer
                );
                const correctOption = question.options.find(
                  (o) => o.id === correctAnswer
                );

                return (
                  <div
                    key={question.id}
                    className={`rounded-lg border p-4 ${
                      isCorrect
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Q{i + 1}. {question.text}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              あなたの回答:{" "}
                            </span>
                            <span
                              className={
                                isCorrect ? "text-green-700" : "text-red-700"
                              }
                            >
                              {selectedOption?.text ?? "未回答"}
                            </span>
                          </p>
                          {!isCorrect && correctOption && (
                            <p>
                              <span className="text-muted-foreground">
                                正解:{" "}
                              </span>
                              <span className="text-green-700">
                                {correctOption.text}
                              </span>
                            </p>
                          )}
                        </div>
                        {question.explanation && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {question.points}点
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {canRetake && !result.passed && (
            <Button onClick={handleStartQuiz} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              再受験する
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
