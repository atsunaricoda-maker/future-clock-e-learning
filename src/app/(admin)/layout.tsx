import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar, adminNavigation } from "@/components/layouts/admin-sidebar";
import { Header } from "@/components/layouts/header";
import { MobileSidebar } from "@/components/layouts/mobile-sidebar";
import { getUnreadNotificationCount } from "@/lib/actions/notification";
import { SessionTracker } from "@/components/providers/session-tracker";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const userName = profile?.full_name ?? user.email ?? "管理者";
  const unreadCount = await getUnreadNotificationCount();

  return (
    <SessionTracker userId={user.id}>
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            userName={userName}
            userRole="admin"
            initialUnreadCount={unreadCount}
            mobileSidebar={
              <MobileSidebar
                navigation={adminNavigation}
                title="FutureClock"
                badge="管理者"
                badgeClassName="bg-primary text-primary-foreground"
                footerText="FutureClock LMS - Admin"
              />
            }
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionTracker>
  );
}
