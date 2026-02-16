"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  quizFormSchema,
  type QuizFormValues,
  type QuestionFormValues,
} from "@/lib/validations/quiz";
import {
  updateQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/lib/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  GripVertical,
  Save,
} from "lucide-react";
import type { Quiz, Question } from "@/types/database";

interface QuizEditorProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  quiz: Quiz;
  questions: Question[];
}

export function QuizEditor({
  courseId,
  lessonId,
  lessonTitle,
  quiz,
  questions: initialQuestions,
}: QuizEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [questionDialog, setQuestionDialog] = useState<{
    open: boolean;
    question?: Question;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    text: string;
  } | null>(null);

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      pass_threshold: quiz.pass_threshold,
      time_limit_seconds: quiz.time_limit_seconds ?? undefined,
      max_attempts: quiz.max_attempts ?? undefined,
      shuffle_questions: quiz.shuffle_questions,
      show_correct_answers: quiz.show_correct_answers,
    },
  });

  // Save quiz settings
  const handleSaveSettings = async (values: QuizFormValues) => {
    setLoading(true);
    const result = await updateQuiz(quiz.id, courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("クイズ設定を保存しました");
      router.refresh();
    }
    setLoading(false);
  };

  // Create question
  const handleCreateQuestion = async (values: QuestionFormValues) => {
    setLoading(true);
    const result = await createQuestion(quiz.id, courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("問題を追加しました");
      setQuestionDialog({ open: false });
      router.refresh();
    }
    setLoading(false);
  };

  // Update question
  const handleUpdateQuestion = async (values: QuestionFormValues) => {
    if (!questionDialog.question) return;
    setLoading(true);
    const result = await updateQuestion(
      questionDialog.question.id,
      courseId,
      values
    );
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("問題を更新しました");
      setQuestionDialog({ open: false });
      router.refresh();
    }
    setLoading(false);
  };

  // Delete question
  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteQuestion(deleteTarget.id, courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("問題を削除しました");
      router.refresh();
    }
    setDeleteTarget(null);
    setLoading(false);
  };

  // Reorder questions
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const ids = initialQuestions.map((q) => q.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderQuestions(quiz.id, courseId, ids);
    router.refresh();
  };

  const handleMoveDown = async (index: number) => {
    if (index === initialQuestions.length - 1) return;
    const ids = initialQuestions.map((q) => q.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderQuestions(quiz.id, courseId, ids);
    router.refresh();
  };

  const totalPoints = initialQuestions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">クイズ設定</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSaveSettings)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pass_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>合格基準 (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        この割合以上の得点で合格
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_limit_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>制限時間（秒）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="未設定"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === "" ? null : Number(val)
                            );
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        空欄で制限時間なし
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最大受験回数</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="無制限"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === "" ? null : Number(val)
                            );
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        空欄で無制限
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="shuffle_questions"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          問題をシャッフル
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="show_correct_answers"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          正解を表示
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "保存中..." : "設定を保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              問題一覧
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({initialQuestions.length}問 / 合計{totalPoints}点)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {initialQuestions.length > 0 ? (
            <div className="space-y-2">
              {initialQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="mt-0.5 text-sm font-medium text-muted-foreground shrink-0">
                    Q{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {question.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {question.type === "multiple_choice"
                          ? "選択式"
                          : "○×式"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {question.points}点
                      </span>
                      {question.correct_answer && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          正解設定済
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === initialQuestions.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setQuestionDialog({ open: true, question })
                      }
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setDeleteTarget({
                          id: question.id,
                          text: question.text,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <XCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                問題がまだ追加されていません
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setQuestionDialog({ open: true })}
          >
            <Plus className="mr-2 h-4 w-4" />
            問題を追加
          </Button>
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog
        open={questionDialog.open}
        onOpenChange={(open) => !open && setQuestionDialog({ open: false })}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {questionDialog.question ? "問題を編集" : "問題を追加"}
            </DialogTitle>
          </DialogHeader>
          <QuestionForm
            initialData={questionDialog.question}
            onSubmit={
              questionDialog.question
                ? handleUpdateQuestion
                : handleCreateQuestion
            }
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>問題を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.text?.slice(0, 50)}
              {(deleteTarget?.text?.length ?? 0) > 50 ? "..." : ""}
              」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
