"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";
import type { CreateUserFormValues } from "@/lib/validations/user";

export async function createUser(
  values: CreateUserFormValues
): Promise<{ error?: string; data?: { id: string } }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Verify caller is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "管理者権限が必要です" };
  }

  try {
    const admin = createAdminClient();

    // Create auth user via admin API
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: { full_name: values.full_name },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return { error: "このメールアドレスはすでに登録されています" };
      }
      console.error("createUser auth error:", authError);
      return { error: "ユーザーの作成に失敗しました" };
    }

    if (!authData.user) {
      return { error: "ユーザーの作成に失敗しました" };
    }

    // Update profile (trigger should have created it, but update role/company)
    const { error: profileError } = await admin
      .from("users")
      .update({
        role: values.role,
        company_id: values.company_id,
        full_name: values.full_name,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("createUser profile error:", profileError);
    }

    revalidatePath("/admin/users");
    return { data: { id: authData.user.id } };
  } catch (err) {
    console.error("createUser error:", err);
    return { error: "ユーザーの作成に失敗しました。SUPABASE_SERVICE_ROLE_KEYが設定されているか確認してください。" };
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Prevent changing own role
  if (user.id === userId) {
    return { error: "自分のロールは変更できません" };
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("updateUserRole error:", error);
    return { error: "ロールの更新に失敗しました" };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Prevent deactivating self
  if (user.id === userId && !isActive) {
    return { error: "自分のアカウントは無効化できません" };
  }

  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    console.error("updateUserStatus error:", error);
    return { error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserCompany(
  userId: string,
  companyId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("users")
    .update({ company_id: companyId })
    .eq("id", userId);

  if (error) {
    console.error("updateUserCompany error:", error);
    return { error: "企業の更新に失敗しました" };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Prevent deleting self
  if (user.id === userId) {
    return { error: "自分のアカウントは削除できません" };
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    console.error("deleteUser error:", error);
    return { error: "ユーザーの削除に失敗しました" };
  }

  revalidatePath("/admin/users");
  return { success: true };
}
