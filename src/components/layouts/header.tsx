"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endActiveSession } from "@/lib/actions/learning-session";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { NotificationBell } from "@/components/layouts/notification-bell";

interface HeaderProps {
  userName: string;
  userRole: string;
  initialUnreadCount: number;
  mobileSidebar?: React.ReactNode;
}

export function Header({ userName, userRole, initialUnreadCount, mobileSidebar }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // 学習セッション終了（手動ログアウト）
    await endActiveSession("manual");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div>{mobileSidebar}</div>
      <div className="flex items-center gap-2">
      <NotificationBell initialUnreadCount={initialUnreadCount} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm md:inline-block">{userName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {{ admin: "管理者", company_admin: "企業管理者", student: "受講生" }[userRole] ?? userRole}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            プロフィール
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
