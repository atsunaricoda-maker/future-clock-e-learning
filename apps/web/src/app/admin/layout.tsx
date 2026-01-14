'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { 
  Shield, 
  Users, 
  BookOpen, 
  Settings, 
  FileCheck,
  ShoppingCart,
  Menu,
  X,
  Home,
  Loader2,
  LogOut,
  ChevronRight,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarItems = [
  { href: '/admin', label: 'ダッシュボード', icon: Home, exact: true },
  { href: '/admin/users', label: 'ユーザー管理', icon: Users },
  { href: '/admin/courses', label: 'コース管理', icon: BookOpen },
  { href: '/admin/course-reviews', label: 'コース審査', icon: FileCheck },
  { href: '/admin/enrollments', label: '受講登録', icon: ShoppingCart },
  { href: '/admin/payouts', label: '講師収益分配', icon: Wallet },
  { href: '/admin/revenue', label: '収益レポート', icon: BarChart3 },
  { href: '/admin/settings', label: 'システム設定', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 認証チェック
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect=/admin';
    }
    return null;
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-6">このページは管理者専用です。</p>
          <Link href="/dashboard">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg">管理者</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <span className="font-bold text-lg">管理者パネル</span>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-160px)] lg:h-[calc(100vh-140px)]">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                  {item.label}
                  {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t px-4 py-4 space-y-2">
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Home className="h-4 w-4" />
                ユーザーダッシュボード
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                logout();
                window.location.href = '/sign-in';
              }}
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
