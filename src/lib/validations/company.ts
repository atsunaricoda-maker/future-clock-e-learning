import { z } from "zod";

export const companyFormSchema = z.object({
  name: z
    .string()
    .min(1, "企業名は必須です")
    .max(255, "企業名は255文字以内で入力してください"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .max(100, "スラッグは100文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "スラッグは半角英数字とハイフンのみ使用できます"),
  plan_type: z.string().min(1, "プランを選択してください"),
  max_users: z
    .number()
    .int()
    .min(1, "1以上の数値を入力してください"),
  is_active: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
