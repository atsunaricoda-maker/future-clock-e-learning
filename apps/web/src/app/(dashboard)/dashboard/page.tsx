'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { BookOpen, Clock, Award, TrendingUp, BarChart3, Play, ChevronRight } from 'lucide-react';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { api } from '@/lib/api';
import Link from 'next/link';

interface DashboardStats {
  enrolledCourses: number;
  weeklyStudyTime: string;
  completedCertificates: number;
  averageProgress: number;
}

interface EnrolledCourse {
  courseId: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  lastAccessedAt: string | null;
  totalLectures: number;
  completedLectures: number;
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);

  console.log('Dashboard render:', { isLoading, isAuthenticated, user: user?.email });

  useEffect(() => {
    // ローディング完了後に認証状態をチェック
    // localStorageにトークンがある場合はリダイレクトしない（まだ読み込み中の可能性）
    if (!isLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        console.log('Dashboard: No token found, will redirect');
        setShouldRedirect(true);
      } else {
        console.log('Dashboard: Token exists but not authenticated yet, waiting...');
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (shouldRedirect) {
      window.location.href = '/sign-in?redirect=/dashboard';
    }
  }, [shouldRedirect]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;
      
      try {
        const [progressRes, certsRes, weeklyRes] = await Promise.all([
          api.getMyProgress(),
          api.getCertificates(),
          api.getWeeklyStudyTime(),
        ]);

        const courses = progressRes.data?.courses || [];
        const certificates = certsRes.data?.certificates || [];
        const weeklyTotal = weeklyRes.data?.thisWeekTotal || 0;

        const avgProgress = courses.length > 0
          ? Math.round(courses.reduce((sum, c) => sum + c.progressPercent, 0) / courses.length)
          : 0;

        const formatWeeklyTime = (minutes: number) => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          if (hours > 0) {
            return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
          }
          return `${mins}分`;
        };

        setStats({
          enrolledCourses: courses.length,
          weeklyStudyTime: formatWeeklyTime(weeklyTotal),
          completedCertificates: certificates.length,
          averageProgress: avgProgress,
        });
        
        // Set enrolled courses for display
        setEnrolledCourses(courses.slice(0, 3).map((c: any) => ({
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          thumbnailUrl: c.thumbnailUrl,
          progressPercent: c.progressPercent,
          lastAccessedAt: c.lastAccessedAt,
          totalLectures: c.totalLectures || 0,
          completedLectures: c.completedLectures || 0,
        })));
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  // ローディング中またはリダイレクト待機中は待機
  if (isLoading || shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // トークンがあるがユーザー情報がまだない場合は待機
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
    if (hasToken) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    return null;
  }

  const statCards = [
    {
      label: '受講中のコース',
      value: statsLoading ? '-' : String(stats?.enrolledCourses || 0),
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '今週の学習時間',
      value: statsLoading ? '-' : (stats?.weeklyStudyTime || '0分'),
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '取得した修了証',
      value: statsLoading ? '-' : String(stats?.completedCertificates || 0),
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: '学習進捗',
      value: statsLoading ? '-' : `${stats?.averageProgress || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          おかえりなさい、{user.name}さん
        </h1>
        <p className="text-muted-foreground mt-1">
          今日も学習を続けましょう
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
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

      {/* Progress Charts Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">学習進捗の詳細</h2>
        <button
          onClick={() => setShowProgressChart(!showProgressChart)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          {showProgressChart ? 'グラフを隠す' : 'グラフを表示'}
        </button>
      </div>

      {/* Progress Chart */}
      {showProgressChart && <ProgressChart />}

      {/* Continue Learning Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">学習を続ける</h2>
          <Link href="/dashboard/courses" className="text-sm text-primary hover:underline flex items-center gap-1">
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5 shadow-sm animate-pulse">
                <div className="aspect-video rounded-lg bg-muted mb-4"></div>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">まだコースに登録していません</h3>
            <p className="text-muted-foreground mb-4">
              興味のあるコースを見つけて学習を始めましょう
            </p>
            <Link href="/courses">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                コースを探す
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Link
                key={course.courseId}
                href={`/courses/${course.courseId}`}
                className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.courseTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/60">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white rounded-full p-3">
                      <Play className="h-6 w-6 text-primary fill-primary" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {course.courseTitle}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {course.completedLectures}/{course.totalLectures} レッスン完了
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>進捗</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${course.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/courses" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">新しいコースを探す</h3>
                <p className="text-sm text-muted-foreground">興味のある分野を学ぶ</p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/certificates" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold">修了証を確認</h3>
                <p className="text-sm text-muted-foreground">取得した資格を管理</p>
              </div>
            </div>
          </Link>
          <Link href="/settings" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-3 rounded-lg group-hover:bg-gray-200 transition-colors">
                <TrendingUp className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold">学習目標を設定</h3>
                <p className="text-sm text-muted-foreground">週間目標を管理</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
