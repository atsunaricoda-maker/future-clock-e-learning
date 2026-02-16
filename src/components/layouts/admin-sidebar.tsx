"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  Tag,
  Megaphone,
  Route,
} from "lucide-react";

export const adminNavigation = [
  {
    name: "ダッシュボード",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "コース管理",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    name: "ユーザー管理",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "企業管理",
    href: "/admin/companies",
    icon: Building2,
  },
  {
    name: "カテゴリ管理",
    href: "/admin/categories",
    icon: Tag,
  },
  {
    name: "コース一括割当",
    href: "/admin/course-assignments",
    icon: ClipboardList,
  },
  {
    name: "学習パス管理",
    href: "/admin/learning-paths",
    icon: Route,
  },
  {
    name: "学習ログ",
    href: "/admin/learning-logs",
    icon: ClipboardCheck,
  },
  {
    name: "お知らせ管理",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    name: "分析",
    href: "/admin/analytics",
    icon: BarChart3,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold text-sidebar-primary">
            FutureClock
          </span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            管理者
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {adminNavigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
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
          FutureClock LMS - Admin
        </p>
      </div>
    </aside>
  );
}
