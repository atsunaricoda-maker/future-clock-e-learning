'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  UserPlus,
  ShoppingCart,
  BarChart3,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

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

  const statCards = [
    {
      label: '総ユーザー数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/admin/users',
      change: '+12%',
      changeUp: true,
    },
    {
      label: '総コース数',
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      href: '/admin/courses',
      change: '+5%',
      changeUp: true,
    },
    {
      label: '総受講登録数',
      value: stats?.totalEnrollments || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      href: '/admin/enrollments',
      change: '+18%',
      changeUp: true,
    },
    {
      label: '総収益',
      value: `¥${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      href: '/admin/revenue',
      change: '+23%',
      changeUp: true,
    },
    {
      label: '今月の新規ユーザー',
      value: stats?.newUsersThisMonth || 0,
      icon: UserPlus,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      href: '/admin/users?filter=new',
      change: '+8%',
      changeUp: true,
    },
    {
      label: '今月の新規受講',
      value: stats?.newEnrollmentsThisMonth || 0,
      icon: TrendingUp,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      href: '/admin/enrollments?filter=new',
      change: '-3%',
      changeUp: false,
    },
  ];

  const quickActions = [
    { label: 'ユーザー管理', icon: Users, href: '/admin/users', description: 'ユーザーの確認・管理' },
    { label: 'コース管理', icon: BookOpen, href: '/admin/courses', description: 'コースの確認・管理' },
    { label: 'コース審査', icon: FileCheck, href: '/admin/course-reviews', description: '審査待ちコースの確認' },
    { label: '収益レポート', icon: BarChart3, href: '/admin/revenue', description: '売上・収益の分析' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">プラットフォームの概要を確認できます</p>
      </div>

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
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.lightColor} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.changeUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.changeUp ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="h-6 w-6 text-gray-500 group-hover:text-blue-600" />
                  <span className="font-medium text-gray-900 group-hover:text-blue-700">{item.label}</span>
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h2>
          <div className="space-y-4">
            {[
              { action: '新規ユーザー登録', detail: 'user@example.com', time: '5分前', type: 'user' },
              { action: 'コース購入', detail: 'Pythonで学ぶAI入門', time: '15分前', type: 'purchase' },
              { action: 'コース審査申請', detail: 'Webデザインの基礎', time: '1時間前', type: 'review' },
              { action: '修了証発行', detail: 'Excel実践講座', time: '2時間前', type: 'certificate' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'user' ? 'bg-blue-500' :
                  activity.type === 'purchase' ? 'bg-green-500' :
                  activity.type === 'review' ? 'bg-yellow-500' : 'bg-purple-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.detail}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
          <Link href="/admin/activity" className="block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
            すべてのアクティビティを見る →
          </Link>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">月別収益推移</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">グラフは収益レポートで確認できます</p>
              <Link href="/admin/revenue" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                収益レポートを見る →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
