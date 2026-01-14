'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  Clock, 
  Settings,
  User,
  CreditCard
} from 'lucide-react';

const sidebarItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'マイコース', icon: BookOpen },
  { href: '/dashboard/certificates', label: '修了証', icon: Award },
  { href: '/dashboard/history', label: '学習履歴', icon: Clock },
  { href: '/dashboard/subscription', label: 'サブスクリプション', icon: CreditCard },
  { href: '/settings', label: '設定', icon: Settings },
  { href: '/profile', label: 'プロフィール', icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
