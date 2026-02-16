import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "@/components/admin/announcement-form";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();

  const [announcementsRes, companiesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, content, type, target, target_company_id, target_course_id, is_active, is_pinned, published_at, expires_at")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const announcements = announcementsRes.data ?? [];
  const companies = (companiesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">お知らせ管理</h1>
        <p className="text-muted-foreground">
          受講生・企業管理者向けのお知らせを管理します
        </p>
      </div>

      <AnnouncementManager
        announcements={announcements}
        companies={companies}
      />
    </div>
  );
}
