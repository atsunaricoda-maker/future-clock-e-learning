import { z } from "zod";

export const siteSettingsSchema = z.object({
  organization_name: z
    .string()
    .min(1, "施設名は必須です")
    .max(255, "255文字以内で入力してください"),
  representative_name: z
    .string()
    .max(255, "255文字以内で入力してください"),
  organization_address: z
    .string()
    .max(500, "500文字以内で入力してください"),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;
