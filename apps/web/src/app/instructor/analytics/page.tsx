'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface AnalyticsData {
  dailyEnrollments: Array<{ date: string; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  courseStats: Array<{
    courseId: string;
    courseTitle: string;
    totalEnrollments: number;
    completedCount: number;
    averageRating: number;
    totalReviews: number;
    totalRevenue: number;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    title: string;
    content: string;
    courseId: string;
    courseTitle: string;
    userName: string;
    createdAt: string;
  }>;
}

export default function InstructorAnalyticsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchAnalytics();
    }
  }, [authLoading, isAuthenticated]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getInstructorAnalytics();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || '分析データの取得に失敗しました');
      }
    } catch (err) {
      setError('分析データの取得に失敗しました');
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
      window.location.href = '/sign-in?redirect=/instructor/analytics';
    }
    return null;
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // 過去30日の日付を生成
  const generateDates = () => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const renderChart = (
    chartData: Array<{ date: string; value: number }>,
    label: string,
    color: string
  ) => {
    const dates = generateDates();
    const values = dates.map((date) => {
      const found = chartData.find((d) => d.date === date);
      return found ? found.value : 0;
    });
    const maxValue = Math.max(...values, 1);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">過去30日</span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {values.map((value, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-80"
              style={{
                height: `${(value / maxValue) * 100}%`,
                minHeight: value > 0 ? '4px' : '0',
                backgroundColor: color,
              }}
              title={`${dates[i]}: ${value}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30日前</span>
          <span>今日</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/instructor">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">分析</h1>
          <p className="text-muted-foreground mt-1">コースのパフォーマンスを確認</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold">受講登録数</h2>
              </div>
              {renderChart(
                (data?.dailyEnrollments || []).map((d) => ({
                  date: d.date,
                  value: d.count,
                })),
                '新規登録',
                '#3B82F6'
              )}
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold">収益</h2>
              </div>
              {renderChart(
                (data?.dailyRevenue || []).map((d) => ({
                  date: d.date,
                  value: d.revenue,
                })),
                '日別収益',
                '#22C55E'
              )}
            </div>
          </div>

          {/* Course Stats */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">コース別パフォーマンス</h2>
            </div>
            {data?.courseStats && data.courseStats.length > 0 ? (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">コース名</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">受講者</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">完了率</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">評価</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">収益</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.courseStats.map((course) => (
                    <tr key={course.courseId} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/instructor/courses/${course.courseId}`}
                          className="font-medium hover:text-primary"
                        >
                          {course.courseTitle}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.totalEnrollments.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.totalEnrollments > 0
                          ? Math.round((course.completedCount / course.totalEnrollments) * 100)
                          : 0}
                        %
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.averageRating > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            {course.averageRating.toFixed(1)}
                            <span className="text-muted-foreground text-xs">
                              ({course.totalReviews})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ¥{course.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>データがありません</p>
              </div>
            )}
          </div>

          {/* Recent Reviews */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold">最近のレビュー</h2>
            </div>
            {data?.recentReviews && data.recentReviews.length > 0 ? (
              <div className="divide-y">
                {data.recentReviews.map((review) => (
                  <div key={review.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">
                            {review.userName}
                          </span>
                        </div>
                        {review.title && (
                          <p className="font-medium mb-1">{review.title}</p>
                        )}
                        {review.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {review.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {review.courseTitle} ・{' '}
                          {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>まだレビューがありません</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
