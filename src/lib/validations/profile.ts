import { z } from "zod";

export const profileFormSchema = z.object({
  full_name: z
    .string()
    .min(1, "表示名は必須です")
    .max(255, "表示名は255文字以内で入力してください"),
  avatar_url: z.string().url("正しいURLを入力してください").or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const passwordChangeSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "現在のパスワードを入力してください"),
    new_password: z
      .string()
      .min(8, "新しいパスワードは8文字以上で入力してください"),
    confirm_password: z
      .string()
      .min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "パスワードが一致しません",
    path: ["confirm_password"],
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
