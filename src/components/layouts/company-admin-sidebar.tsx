"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  User,
} from "lucide-react";

export const companyAdminNavigation = [
  {
    name: "ダッシュボード",
    href: "/company",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "社員管理",
    href: "/company/members",
    icon: Users,
  },
  {
    name: "コース管理",
    href: "/company/courses",
    icon: BookOpen,
  },
  {
    name: "学習ログ",
    href: "/company/learning-logs",
    icon: ClipboardCheck,
  },
  {
    name: "分析",
    href: "/company/analytics",
    icon: BarChart3,
  },
  {
    name: "プロフィール",
    href: "/profile",
    icon: User,
  },
];

export function CompanyAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/company" className="flex items-center gap-2">
          <span className="text-lg font-bold text-sidebar-primary">
            FutureClock
          </span>
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            企業管理者
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {companyAdminNavigation.map((item) => {
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
          FutureClock LMS - 企業管理
        </p>
      </div>
    </aside>
  );
}
