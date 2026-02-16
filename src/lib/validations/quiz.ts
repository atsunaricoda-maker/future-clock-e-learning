import { z } from "zod";

export const quizFormSchema = z.object({
  pass_threshold: z
    .number()
    .int()
    .min(0, "0以上で入力してください")
    .max(100, "100以下で入力してください"),
  time_limit_seconds: z.number().int().positive().nullable().optional(),
  max_attempts: z.number().int().positive().nullable().optional(),
  shuffle_questions: z.boolean(),
  show_correct_answers: z.boolean(),
});

export type QuizFormValues = z.infer<typeof quizFormSchema>;

const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "選択肢を入力してください"),
});

export const questionFormSchema = z.object({
  type: z.enum(["multiple_choice", "true_false"]),
  text: z.string().min(1, "問題文は必須です"),
  options: z
    .array(questionOptionSchema)
    .min(2, "選択肢は2つ以上必要です"),
  correct_answer_id: z.string().min(1, "正解を選択してください"),
  explanation: z.string().optional(),
  points: z.number().int().min(1, "1以上の配点を設定してください"),
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
