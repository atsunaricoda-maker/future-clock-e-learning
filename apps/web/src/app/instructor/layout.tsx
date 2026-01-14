'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/lib/auth';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  DollarSign,
  MessageSquare,
  Settings,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarItems = [
  { href: '/instructor', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/instructor/courses', label: 'コース管理', icon: BookOpen },
  { href: '/instructor/analytics', label: '分析', icon: BarChart3 },
  { href: '/instructor/earnings', label: '収益', icon: DollarSign },
  { href: '/instructor/messages', label: 'メッセージ', icon: MessageSquare },
  { href: '/instructor/settings', label: '設定', icon: Settings },
];

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
          <div className="p-4 border-b">
            <Link href="/instructor/courses/new">
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                新規コース作成
              </Button>
            </Link>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/instructor' && pathname.startsWith(item.href));
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
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
