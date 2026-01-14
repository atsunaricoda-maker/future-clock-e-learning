'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BookOpen, Users, DollarSign, Star, TrendingUp, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  publishedCourses: number;
  totalEnrollments: number;
  monthlyRevenue: number;
  averageRating: number;
  newEnrollmentsThisMonth: number;
}

interface Course {
  id: string;
  title: string;
  status: string;
  isPublished: boolean;
  totalEnrollments: number;
  averageRating: number;
  totalRevenue: number;
}

export default function InstructorDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, coursesRes] = await Promise.all([
        api.getInstructorStats(),
        api.getInstructorCourses({ limit: 5 }),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data.courses);
      }
    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect=/instructor';
    }
    return null;
  }

  const statItems = [
    {
      label: '公開中のコース',
      value: stats?.publishedCourses || 0,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '総受講者数',
      value: (stats?.totalEnrollments || 0).toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '今月の収益',
      value: `¥${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: '平均評価',
      value: stats?.averageRating?.toFixed(1) || '-',
      icon: Star,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const getStatusBadge = (course: Course) => {
    if (course.isPublished) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">公開中</span>;
    }
    switch (course.status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">下書き</span>;
      case 'pending_review':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">審査中</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{course.status}</span>;
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))
        ) : (
          statItems.map((stat, index) => {
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
          })
        )}
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
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>まだコースがありません</p>
              <Link href="/instructor/courses/new" className="text-primary hover:underline mt-2 inline-block">
                最初のコースを作成する
              </Link>
            </div>
          ) : (
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
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/instructor/courses/${course.id}`} className="font-medium hover:text-primary">
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(course)}</td>
                    <td className="px-4 py-3 text-right">{(course.totalEnrollments || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {course.averageRating > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          {course.averageRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">¥{(course.totalRevenue || 0).toLocaleString()}</td>
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
          )}
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
        <Link href="/instructor/questions" className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
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
