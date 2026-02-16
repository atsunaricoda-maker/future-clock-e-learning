"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Award,
  User,
  Route,
} from "lucide-react";

export const studentNavigation = [
  {
    name: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "コース一覧",
    href: "/courses",
    icon: BookOpen,
  },
  {
    name: "学習パス",
    href: "/learning-paths",
    icon: Route,
  },
  {
    name: "マイコース",
    href: "/my-courses",
    icon: Library,
  },
  {
    name: "修了証明書",
    href: "/certificates",
    icon: Award,
  },
  {
    name: "プロフィール",
    href: "/profile",
    icon: User,
  },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-sidebar-primary">
            FutureClock
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {studentNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3">
        <p className="text-xs text-sidebar-foreground/50">
          FutureClock LMS
        </p>
      </div>
    </aside>
  );
}
