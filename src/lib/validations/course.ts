import { z } from "zod";

export const courseFormSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(255, "タイトルは255文字以内で入力してください"),
  description: z.string(),
  short_description: z
    .string()
    .max(500, "概要は500文字以内で入力してください"),
  thumbnail_url: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  is_public: z.boolean(),
  estimated_duration_min: z.number().int().positive().nullable().optional(),
  difficulty_level: z.string(),
  category: z.string(),
  tags: z.string(), // comma-separated, parsed on server
  price: z.number().int().nonnegative(),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const sectionFormSchema = z.object({
  title: z
    .string()
    .min(1, "セクション名は必須です")
    .max(255, "セクション名は255文字以内で入力してください"),
  description: z.string(),
});

export type SectionFormValues = z.infer<typeof sectionFormSchema>;

export const lessonFormSchema = z.object({
  title: z
    .string()
    .min(1, "レッスン名は必須です")
    .max(255, "レッスン名は255文字以内で入力してください"),
  description: z.string(),
  type: z.enum(["video", "document", "quiz"]),
  content_url: z.string().optional(),
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  is_preview: z.boolean(),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;
