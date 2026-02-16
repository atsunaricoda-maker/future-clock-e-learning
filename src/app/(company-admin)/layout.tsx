import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyAdminSidebar, companyAdminNavigation } from "@/components/layouts/company-admin-sidebar";
import { Header } from "@/components/layouts/header";
import { MobileSidebar } from "@/components/layouts/mobile-sidebar";
import { getUnreadNotificationCount } from "@/lib/actions/notification";
import { SessionTracker } from "@/components/providers/session-tracker";

export default async function CompanyAdminLayout({
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

  if (profile?.role !== "company_admin") {
    redirect("/dashboard");
  }

  const userName = profile?.full_name ?? user.email ?? "企業管理者";
  const unreadCount = await getUnreadNotificationCount();

  return (
    <SessionTracker userId={user.id}>
      <div className="flex h-screen">
        <CompanyAdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            userName={userName}
            userRole="company_admin"
            initialUnreadCount={unreadCount}
            mobileSidebar={
              <MobileSidebar
                navigation={companyAdminNavigation}
                title="FutureClock"
                badge="企業管理者"
                badgeClassName="bg-blue-600 text-white"
                footerText="FutureClock LMS - 企業管理"
              />
            }
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionTracker>
  );
}
