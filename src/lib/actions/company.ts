"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CompanyFormValues } from "@/lib/validations/company";

export async function createCompany(values: CompanyFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: values.name,
      slug: values.slug,
      plan_type: values.plan_type,
      max_users: values.max_users,
      is_active: values.is_active,
    })
    .select()
    .single();

  if (error) {
    console.error("createCompany error:", error);
    if (error.code === "23505") {
      return { error: "このスラッグは既に使用されています" };
    }
    return { error: "企業の作成に失敗しました" };
  }

  revalidatePath("/admin/companies");
  return { data };
}

export async function updateCompany(companyId: string, values: CompanyFormValues) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data, error } = await supabase
    .from("companies")
    .update({
      name: values.name,
      slug: values.slug,
      plan_type: values.plan_type,
      max_users: values.max_users,
      is_active: values.is_active,
    })
    .eq("id", companyId)
    .select()
    .single();

  if (error) {
    console.error("updateCompany error:", error);
    if (error.code === "23505") {
      return { error: "このスラッグは既に使用されています" };
    }
    return { error: "企業の更新に失敗しました" };
  }

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  return { data };
}

export async function updateCompanyStatus(companyId: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("companies")
    .update({ is_active: isActive })
    .eq("id", companyId);

  if (error) {
    console.error("updateCompanyStatus error:", error);
    return { error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/admin/companies");
  return { success: true };
}

export async function deleteCompany(companyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);

  if (error) {
    console.error("deleteCompany error:", error);
    return { error: "企業の削除に失敗しました" };
  }

  revalidatePath("/admin/companies");
  return { success: true };
}
