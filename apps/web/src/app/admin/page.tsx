'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  UserPlus,
  ShoppingCart,
  Settings,
  BarChart3,
  Shield,
  Loader2,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  newEnrollmentsThisMonth: number;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchStats();
    }
  }, [authLoading, isAuthenticated, user?.role]);

  const fetchStats = async () => {
    try {
      const response = await api.getAdminStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error?.message || '統計情報の取得に失敗しました');
      }
    } catch (err) {
      setError('統計情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    return null;
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-4">このページは管理者専用です。</p>
          <Link href="/dashboard">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: '総ユーザー数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users',
    },
    {
      label: '総コース数',
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      color: 'bg-green-500',
      href: '/admin/courses',
    },
    {
      label: '総受講登録数',
      value: stats?.totalEnrollments || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      href: '/admin/enrollments',
    },
    {
      label: '総収益',
      value: `¥${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      href: '/admin/revenue',
    },
    {
      label: '今月の新規ユーザー',
      value: stats?.newUsersThisMonth || 0,
      icon: UserPlus,
      color: 'bg-indigo-500',
      href: '/admin/users?filter=new',
    },
    {
      label: '今月の新規受講',
      value: stats?.newEnrollmentsThisMonth || 0,
      icon: TrendingUp,
      color: 'bg-pink-500',
      href: '/admin/enrollments?filter=new',
    },
  ];

  const menuItems = [
    { label: 'ユーザー管理', icon: Users, href: '/admin/users' },
    { label: 'コース管理', icon: BookOpen, href: '/admin/courses' },
    { label: '収益レポート', icon: BarChart3, href: '/admin/revenue' },
    { label: 'システム設定', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">ユーザーダッシュボードへ</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
              </div>
            ))
          ) : (
            statCards.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                  <item.icon className="h-8 w-8 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h2>
          <div className="text-gray-500 text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>アクティビティデータは準備中です</p>
          </div>
        </div>
      </main>
    </div>
  );
}
