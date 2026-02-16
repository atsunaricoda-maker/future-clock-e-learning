import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/user/profile-form";
import { PasswordChangeForm } from "@/components/user/password-change-form";
import { NotificationSettings } from "@/components/user/notification-settings";
import type { NotificationPreferences } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*, companies(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const company = profile.companies as { name: string } | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">プロフィール</h1>
        <p className="text-muted-foreground">
          アカウント情報の確認とプロフィールの編集ができます
        </p>
      </div>
      <ProfileForm
        user={{
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
          company_name: company?.name ?? null,
          created_at: profile.created_at,
        }}
      />
      <PasswordChangeForm />
      <NotificationSettings
        initialPreferences={
          profile.notification_preferences as NotificationPreferences | null
        }
      />
    </div>
  );
}
