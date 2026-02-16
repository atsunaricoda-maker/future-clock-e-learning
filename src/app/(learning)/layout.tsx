import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionTracker } from "@/components/providers/session-tracker";

export default async function LearningLayout({
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

  return (
    <SessionTracker userId={user.id}>
      <div className="h-screen bg-background">{children}</div>
    </SessionTracker>
  );
}
