import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar, studentNavigation } from "@/components/layouts/student-sidebar";
import { Header } from "@/components/layouts/header";
import { MobileSidebar } from "@/components/layouts/mobile-sidebar";
import { getUnreadNotificationCount } from "@/lib/actions/notification";
import { SessionTracker } from "@/components/providers/session-tracker";

export default async function StudentLayout({
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

  const userName = profile?.full_name ?? user.email ?? "ユーザー";
  const userRole = profile?.role ?? "student";
  const unreadCount = await getUnreadNotificationCount();

  return (
    <SessionTracker userId={user.id}>
      <div className="flex h-screen">
        <StudentSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            userName={userName}
            userRole={userRole}
            initialUnreadCount={unreadCount}
            mobileSidebar={
              <MobileSidebar
                navigation={studentNavigation}
                title="FutureClock"
                footerText="FutureClock LMS"
              />
            }
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionTracker>
  );
}
