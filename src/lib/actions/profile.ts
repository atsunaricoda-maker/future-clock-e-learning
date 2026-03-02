"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileFormSchema, passwordChangeSchema } from "@/lib/validations/profile";
import type { ProfileFormValues, PasswordChangeValues } from "@/lib/validations/profile";
import type { NotificationPreferences } from "@/types/database";

export async function updateProfile(values: ProfileFormValues) {
  // サーバーサイド バリデーション
  const parsed = profileFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("users")
    .update({
      full_name: values.full_name,
      avatar_url: values.avatar_url || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile error:", error);
    return { error: "プロフィールの更新に失敗しました" };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(
  values: PasswordChangeValues
): Promise<{ error?: string; success?: boolean }> {
  // サーバーサイド バリデーション
  const parsed = passwordChangeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: values.current_password,
  });

  if (signInError) {
    return { error: "現在のパスワードが正しくありません" };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: values.new_password,
  });

  if (updateError) {
    console.error("changePassword error:", updateError);
    return { error: "パスワードの変更に失敗しました" };
  }

  return { success: true };
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("users")
    .update({ notification_preferences: preferences })
    .eq("id", user.id);

  if (error) {
    console.error("updateNotificationPreferences error:", error);
    return { error: "通知設定の更新に失敗しました" };
  }

  revalidatePath("/profile");
  return { success: true };
}
