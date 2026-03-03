"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteSettingsSchema } from "@/lib/validations/site-settings";
import type { SiteSettingsFormValues } from "@/lib/validations/site-settings";

export async function getSiteSettings(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getOrganizationInfo() {
  const settings = await getSiteSettings();
  return {
    organization_name: settings["organization_name"] || "FutureClock",
    representative_name: settings["representative_name"] || "",
    organization_address: settings["organization_address"] || "",
  };
}

export async function updateSiteSettings(
  values: SiteSettingsFormValues
): Promise<{ error?: string; success?: boolean }> {
  const parsed = siteSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "管理者権限が必要です" };
  }

  const updates: Record<string, string> = {
    organization_name: parsed.data.organization_name,
    representative_name: parsed.data.representative_name,
    organization_address: parsed.data.organization_address,
  };

  for (const [key, value] of Object.entries(updates)) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key, value, updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      console.error("updateSiteSettings error:", error);
      return { error: "設定の保存に失敗しました" };
    }
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
