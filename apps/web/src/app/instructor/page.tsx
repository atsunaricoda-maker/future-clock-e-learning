'use client';

import { useAuth } from '@/lib/auth';
import { BookOpen, Users, DollarSign, Star, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';

export default function InstructorDashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      label: '公開中のコース',
      value: '3',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '総受講者数',
      value: '4,510',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '今月の収益',
      value: '¥128,500',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: '平均評価',
      value: '4.5',
      icon: Star,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentCourses = [
    {
      id: 'course-1',
      title: 'Pythonで学ぶAI入門',
      status: 'published',
      enrollments: 1520,
      rating: 4.5,
      revenue: 89000,
    },
    {
      id: 'course-2',
      title: 'Webデザインの基礎',
      status: 'published',
      enrollments: 890,
      rating: 4.3,
      revenue: 42000,
    },
    {
      id: 'course-3',
      title: 'ビジネス英語マスター',
      status: 'published',
      enrollments: 2100,
      rating: 4.7,
      revenue: 156000,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">公開中</span>;
      case 'draft':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">下書き</span>;
      case 'pending_review':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">審査中</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">講師ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">
          {user?.name}さん、おかえりなさい
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">コース一覧</h2>
          <Link href="/instructor/courses" className="text-sm text-primary hover:underline">
            すべて見る
          </Link>
        </div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">コース名</th>
                <th className="text-left px-4 py-3 text-sm font-medium">ステータス</th>
                <th className="text-right px-4 py-3 text-sm font-medium">受講者</th>
                <th className="text-right px-4 py-3 text-sm font-medium">評価</th>
                <th className="text-right px-4 py-3 text-sm font-medium">収益</th>
                <th className="text-right px-4 py-3 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentCourses.map((course) => (
                <tr key={course.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/instructor/courses/${course.id}`} className="font-medium hover:text-primary">
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(course.status)}</td>
                  <td className="px-4 py-3 text-right">{course.enrollments.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      {course.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">¥{course.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/instructor/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/instructor/courses/new" className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">新規コース作成</p>
              <p className="text-sm text-muted-foreground">新しいコースを作成する</p>
            </div>
          </div>
        </Link>
        <Link href="/instructor/analytics" className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">分析を見る</p>
              <p className="text-sm text-muted-foreground">受講者の動向を確認</p>
            </div>
          </div>
        </Link>
        <Link href="/instructor/messages" className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Q&A対応</p>
              <p className="text-sm text-muted-foreground">受講者からの質問に回答</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
