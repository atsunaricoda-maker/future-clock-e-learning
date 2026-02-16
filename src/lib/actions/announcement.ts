"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AnnouncementInput {
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "maintenance";
  target: "all" | "students" | "company_admins";
  target_company_id?: string | null;
  target_course_id?: string | null;
  is_pinned?: boolean;
  expires_at?: string | null;
}

export async function createAnnouncement(input: AnnouncementInput) {
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
  if (profile?.role !== "admin") return { error: "管理者権限が必要です" };

  const { error } = await supabase.from("announcements").insert({
    ...input,
    target_company_id: input.target_company_id || null,
    target_course_id: input.target_course_id || null,
    created_by: user.id,
  });

  if (error) {
    console.error("createAnnouncement error:", error);
    return { error: "お知らせの作成に失敗しました" };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput> & { is_active?: boolean }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("announcements")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateAnnouncement error:", error);
    return { error: "お知らせの更新に失敗しました" };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteAnnouncement error:", error);
    return { error: "お知らせの削除に失敗しました" };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get active announcements for the current user context
 */
export async function getActiveAnnouncements(options?: {
  companyId?: string | null;
  role?: string;
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("announcements")
    .select("id, title, content, type, target, target_company_id, target_course_id, is_pinned, published_at, expires_at")
    .eq("is_active", true)
    .lte("published_at", now)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  const { data } = await query;

  // Filter out expired announcements and by target audience
  const announcements = (data ?? []).filter((a) => {
    // Check expiry
    if (a.expires_at && new Date(a.expires_at) < new Date()) return false;

    // Check target audience
    if (a.target === "all") return true;
    if (a.target === "students" && options?.role === "student") return true;
    if (a.target === "company_admins" && options?.role === "company_admin") return true;

    // Check company-specific
    if (a.target_company_id && options?.companyId) {
      return a.target_company_id === options.companyId;
    }

    // Admin always sees all
    if (options?.role === "admin") return true;

    return a.target === "all";
  });

  return announcements;
}
