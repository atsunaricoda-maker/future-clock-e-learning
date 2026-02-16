import { z } from "zod";

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスは必須です")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください"),
  full_name: z
    .string()
    .min(1, "氏名は必須です")
    .max(255, "氏名は255文字以内で入力してください"),
  role: z.enum(["admin", "company_admin", "student"], {
    message: "ロールを選択してください",
  }),
  company_id: z.string().nullable(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
