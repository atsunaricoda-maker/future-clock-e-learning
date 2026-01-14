'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Star,
  Loader2,
  BookOpen,
  Calendar,
  BarChart3,
  Award,
  Target,
  RefreshCw,
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

interface SummaryStats {
  totalEnrollments: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  thisMonthEnrollments: number;
  lastMonthEnrollments: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  ratingDistribution: Record<number, number>;
}

export default function InstructorAnalyticsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

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

  // Calculate summary stats
  const summaryStats = useMemo<SummaryStats | null>(() => {
    if (!data) return null;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

    // Aggregate from daily data
    let thisMonthEnrollments = 0;
    let lastMonthEnrollments = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    data.dailyEnrollments.forEach(d => {
      const date = new Date(d.date);
      if (date >= thisMonthStart) {
        thisMonthEnrollments += d.count;
      } else if (date >= lastMonthStart && date <= lastMonthEnd) {
        lastMonthEnrollments += d.count;
      }
    });

    data.dailyRevenue.forEach(d => {
      const date = new Date(d.date);
      if (date >= thisMonthStart) {
        thisMonthRevenue += d.revenue;
      } else if (date >= lastMonthStart && date <= lastMonthEnd) {
        lastMonthRevenue += d.revenue;
      }
    });

    // Calculate rating distribution from reviews
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.recentReviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating]++;
      }
    });

    // Aggregate from course stats
    const totalEnrollments = data.courseStats.reduce((sum, c) => sum + c.totalEnrollments, 0);
    const totalRevenue = data.courseStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalCompleted = data.courseStats.reduce((sum, c) => sum + c.completedCount, 0);
    
    const weightedRating = data.courseStats.reduce((sum, c) => sum + c.averageRating * c.totalReviews, 0);
    const totalReviews = data.courseStats.reduce((sum, c) => sum + c.totalReviews, 0);
    const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0;
    
    const completionRate = totalEnrollments > 0 ? (totalCompleted / totalEnrollments) * 100 : 0;

    return {
      totalEnrollments,
      totalRevenue,
      averageRating,
      completionRate,
      thisMonthEnrollments,
      lastMonthEnrollments,
      thisMonthRevenue,
      lastMonthRevenue,
      ratingDistribution,
    };
  }, [data]);

  // Calculate period change percentage
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get filtered data based on date range
  const getFilteredDates = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
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

  // Generate dates based on selected range
  const generateDates = () => {
    return getFilteredDates();
  };

  const renderChart = (
    chartData: Array<{ date: string; value: number }>,
    label: string,
    color: string,
    showTotal: boolean = false
  ) => {
    const dates = generateDates();
    const values = dates.map((date) => {
      const found = chartData.find((d) => d.date === date);
      return found ? found.value : 0;
    });
    const maxValue = Math.max(...values, 1);
    const total = values.reduce((sum, v) => sum + v, 0);
    const rangeLabel = dateRange === '7d' ? '7日' : dateRange === '30d' ? '30日' : '90日';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          {showTotal && (
            <span className="font-semibold text-foreground">
              合計: {typeof total === 'number' && label.includes('収益') 
                ? `¥${total.toLocaleString()}` 
                : total.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-end gap-[2px] h-32">
          {values.map((value, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer"
              style={{
                height: `${(value / maxValue) * 100}%`,
                minHeight: value > 0 ? '4px' : '0',
                backgroundColor: color,
              }}
              title={`${dates[i]}: ${typeof value === 'number' && label.includes('収益') 
                ? `¥${value.toLocaleString()}` 
                : value.toLocaleString()}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{rangeLabel}前</span>
          <span>今日</span>
        </div>
      </div>
    );
  };

  // Render rating distribution chart
  const renderRatingDistribution = () => {
    if (!summaryStats) return null;
    
    const totalRatings = Object.values(summaryStats.ratingDistribution).reduce((a, b) => a + b, 0);
    if (totalRatings === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>レビューデータがありません</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = summaryStats.ratingDistribution[rating] || 0;
          const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {count}件
              </span>
            </div>
          );
        })}
        <div className="pt-2 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">合計レビュー数</span>
          <span className="font-semibold">{totalRatings}件</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">分析ダッシュボード</h1>
            <p className="text-muted-foreground mt-1">コースのパフォーマンスを詳細に分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
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
          {/* Summary Cards */}
          {summaryStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg p-2 bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  {summaryStats.lastMonthEnrollments > 0 && (
                    <span className={`flex items-center text-xs font-medium ${
                      getChangePercent(summaryStats.thisMonthEnrollments, summaryStats.lastMonthEnrollments) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getChangePercent(summaryStats.thisMonthEnrollments, summaryStats.lastMonthEnrollments) >= 0 
                        ? <TrendingUp className="h-3 w-3 mr-1" />
                        : <TrendingDown className="h-3 w-3 mr-1" />
                      }
                      {getChangePercent(summaryStats.thisMonthEnrollments, summaryStats.lastMonthEnrollments)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold mt-3">{summaryStats.totalEnrollments.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">累計受講者数</p>
                <p className="text-xs text-muted-foreground mt-1">
                  今月: {summaryStats.thisMonthEnrollments}人
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg p-2 bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  {summaryStats.lastMonthRevenue > 0 && (
                    <span className={`flex items-center text-xs font-medium ${
                      getChangePercent(summaryStats.thisMonthRevenue, summaryStats.lastMonthRevenue) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getChangePercent(summaryStats.thisMonthRevenue, summaryStats.lastMonthRevenue) >= 0 
                        ? <TrendingUp className="h-3 w-3 mr-1" />
                        : <TrendingDown className="h-3 w-3 mr-1" />
                      }
                      {getChangePercent(summaryStats.thisMonthRevenue, summaryStats.lastMonthRevenue)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold mt-3">¥{summaryStats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">累計収益</p>
                <p className="text-xs text-muted-foreground mt-1">
                  今月: ¥{summaryStats.thisMonthRevenue.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg p-2 bg-yellow-100">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-3">
                  {summaryStats.averageRating > 0 ? summaryStats.averageRating.toFixed(1) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">平均評価</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= summaryStats.averageRating 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg p-2 bg-purple-100">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-3">
                  {summaryStats.completionRate.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">完了率</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${summaryStats.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">期間:</span>
            <div className="flex rounded-lg border bg-card overflow-hidden">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {range === '7d' ? '7日' : range === '30d' ? '30日' : '90日'}
                </button>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold">受講登録トレンド</h2>
              </div>
              {renderChart(
                (data?.dailyEnrollments || []).map((d) => ({
                  date: d.date,
                  value: d.count,
                })),
                '新規登録',
                '#3B82F6',
                true
              )}
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold">収益トレンド</h2>
              </div>
              {renderChart(
                (data?.dailyRevenue || []).map((d) => ({
                  date: d.date,
                  value: d.revenue,
                })),
                '日別収益',
                '#22C55E',
                true
              )}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-yellow-500" />
                <h2 className="font-semibold">レビュー評価分布</h2>
              </div>
              {renderRatingDistribution()}
            </div>

            {/* Top Performers */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-orange-500" />
                <h2 className="font-semibold">トップパフォーマー</h2>
              </div>
              {data?.courseStats && data.courseStats.length > 0 ? (
                <div className="space-y-4">
                  {data.courseStats
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .slice(0, 3)
                    .map((course, index) => (
                      <div key={course.courseId} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/instructor/courses/${course.courseId}`}
                            className="font-medium hover:text-primary truncate block"
                          >
                            {course.courseTitle}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            ¥{course.totalRevenue.toLocaleString()} · {course.totalEnrollments}人
                          </p>
                        </div>
                        {course.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm">{course.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>データがありません</p>
                </div>
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
