'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { BookOpen, Clock, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { api } from '@/lib/api';

interface DashboardStats {
  enrolledCourses: number;
  weeklyStudyTime: string;
  completedCertificates: number;
  averageProgress: number;
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
        <h2 className="text-lg font-semibold mb-4">学習を続ける</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Pythonで学ぶAI入門',
              progress: 65,
              lastLesson: 'セクション3: 機械学習の基礎',
            },
            {
              title: 'Webデザインの基礎',
              progress: 30,
              lastLesson: 'セクション2: CSSレイアウト',
            },
            {
              title: 'ビジネス英語マスター',
              progress: 85,
              lastLesson: 'セクション8: プレゼンテーション',
            },
          ].map((course, index) => (
            <div
              key={index}
              className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="aspect-video rounded-lg bg-muted mb-4"></div>
              <h3 className="font-semibold">{course.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {course.lastLesson}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>進捗</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">最近のアクティビティ</h2>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="divide-y">
            {[
              {
                action: 'レッスンを完了',
                course: 'Pythonで学ぶAI入門',
                detail: '「ニューラルネットワークの基礎」',
                time: '2時間前',
              },
              {
                action: 'クイズに合格',
                course: 'Webデザインの基礎',
                detail: 'セクション2 確認テスト（90点）',
                time: '昨日',
              },
              {
                action: '修了証を取得',
                course: 'Excel実践講座',
                detail: 'コース修了おめでとうございます！',
                time: '3日前',
              },
            ].map((activity, index) => (
              <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.course} - {activity.detail}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
