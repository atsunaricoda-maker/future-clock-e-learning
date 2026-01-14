'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@webapp/ui';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  Shield,
  FileCheck,
  CreditCard,
} from 'lucide-react';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'ユーザー管理', href: '/users', icon: Users },
  { name: '講師管理', href: '/instructors', icon: GraduationCap },
  { name: 'コース管理', href: '/courses', icon: BookOpen },
  { name: 'コース審査', href: '/reviews', icon: FileCheck },
  { name: '決済・売上', href: '/payments', icon: CreditCard },
  { name: 'レポート', href: '/reports', icon: BarChart3 },
  { name: '権限管理', href: '/permissions', icon: Shield },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r bg-sidebar lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            e-Learning Platform Admin
          </p>
          <p className="text-xs text-muted-foreground">
            Version 0.1.0 (MVP)
          </p>
        </div>
      </div>
    </aside>
  );
}
