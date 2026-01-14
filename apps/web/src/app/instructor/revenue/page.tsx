'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Wallet,
  Loader2,
  Download,
  Calendar,
  Info,
  PieChart,
  Users,
  ShoppingCart,
  Award,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface RevenueData {
  commissionRate: number;
  totalEarnings: number;
  pendingBalance: number;
  basicIncomePool?: number;
  monthly: Array<{
    month: string;
    grossRevenue: number;
    netRevenue: number;
    transactionCount: number;
    revenueSource?: {
      organic: number;
      platformDriven: number;
      affiliate: number;
    };
  }>;
  byCourse: Array<{
    courseId: string;
    courseTitle: string;
    grossRevenue: number;
    netRevenue: number;
    salesCount: number;
    isPPV?: boolean;
    isSubscription?: boolean;
  }>;
}

export default function InstructorRevenuePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRevenueInfo, setShowRevenueInfo] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchRevenue();
    }
  }, [authLoading, isAuthenticated]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const response = await api.getInstructorRevenue();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || '収益データの取得に失敗しました');
      }
    } catch (err) {
      setError('収益データの取得に失敗しました');
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
      window.location.href = '/sign-in?redirect=/instructor/revenue';
    }
    return null;
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // Calculate total values
  const totalGross = data?.monthly.reduce((sum, m) => sum + m.grossRevenue, 0) || 0;
  const totalNet = data?.monthly.reduce((sum, m) => sum + m.netRevenue, 0) || 0;
  const totalTransactions = data?.monthly.reduce((sum, m) => sum + m.transactionCount, 0) || 0;
  const yourShare = 100 - (data?.commissionRate || 30);

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
            <h1 className="text-2xl font-bold">収益管理</h1>
            <p className="text-muted-foreground mt-1">売上とレベニューシェアの管理</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          レポートをダウンロード
        </Button>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">¥{totalNet.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">累計収益（手取り）</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-blue-100">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">¥{(data?.pendingBalance || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">未払い残高</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-purple-100">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTransactions}件</p>
                  <p className="text-sm text-muted-foreground">総取引数</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-yellow-100">
                  <PieChart className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{yourShare}%</p>
                  <p className="text-sm text-muted-foreground">あなたの取り分</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Share Model */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div 
              className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => setShowRevenueInfo(!showRevenueInfo)}
            >
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">レベニューシェアモデル</h2>
              </div>
              <ChevronRight className={`h-5 w-5 transition-transform ${showRevenueInfo ? 'rotate-90' : ''}`} />
            </div>
            
            {showRevenueInfo && (
              <div className="p-6 space-y-6">
                {/* PPV Model */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    単品販売（PPV）
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-600 mb-1">講師経由の売上</p>
                      <p className="text-2xl font-bold text-blue-700">90%</p>
                      <p className="text-xs text-blue-500 mt-1">（プラットフォーム10%）</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-sm text-indigo-600 mb-1">プラットフォーム経由</p>
                      <p className="text-2xl font-bold text-indigo-700">60%</p>
                      <p className="text-xs text-indigo-500 mt-1">（プラットフォーム40%）</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-sm text-purple-600 mb-1">アフィリエイト経由</p>
                      <p className="text-2xl font-bold text-purple-700">50%</p>
                      <p className="text-xs text-purple-500 mt-1">（アフィ10%/プラットフォーム40%）</p>
                    </div>
                  </div>
                </div>

                {/* Subscription Model */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    サブスクリプション
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm text-green-600 mb-1">視聴時間に応じた分配</p>
                      <p className="text-2xl font-bold text-green-700">60%</p>
                      <p className="text-xs text-green-500 mt-1">講師プールへの配分（プラットフォーム40%）</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-sm text-emerald-600 mb-1">ベーシックインカム制度</p>
                      <p className="text-lg font-bold text-emerald-700">最低¥3万/月</p>
                      <p className="text-xs text-emerald-500 mt-1">条件を満たす講師への最低保証</p>
                    </div>
                  </div>
                </div>

                {/* Basic Income Details */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5" />
                    ベーシックインカム制度について
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 登録1年以上経過した講師が対象</li>
                    <li>• 最低保証額: 月額¥30,000</li>
                    <li>• 視聴実績に応じて分配される</li>
                    <li>• 収益が保証額に満たない場合、差額が補填されます</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Commission Breakdown */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              あなたの収益内訳
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">累計売上（税込）</p>
                <p className="text-2xl font-bold">¥{totalGross.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">プラットフォーム手数料</p>
                <p className="text-2xl font-bold text-red-600">-¥{(totalGross - totalNet).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{data?.commissionRate || 30}%</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">あなたの収益</p>
                <p className="text-2xl font-bold text-green-700">¥{totalNet.toLocaleString()}</p>
                <p className="text-xs text-green-600">{yourShare}%</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">次回振込予定</p>
                <p className="text-2xl font-bold text-blue-700">¥{(data?.pendingBalance || 0).toLocaleString()}</p>
                <p className="text-xs text-blue-600">毎月月末締め、翌月末払い</p>
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">月別収益</h2>
            </div>
            {data?.monthly && data.monthly.length > 0 ? (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">月</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">売上（税込）</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">手取り</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">取引数</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">シェア率</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.monthly.map((month) => {
                    const shareRate = month.grossRevenue > 0 
                      ? ((month.netRevenue / month.grossRevenue) * 100).toFixed(0) 
                      : '-';
                    return (
                      <tr key={month.month} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{formatMonth(month.month)}</td>
                        <td className="px-4 py-3 text-right">¥{month.grossRevenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          ¥{month.netRevenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">{month.transactionCount}件</td>
                        <td className="px-4 py-3 text-right">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm">
                            {shareRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>まだ収益データがありません</p>
              </div>
            )}
          </div>

          {/* Revenue by Course */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">コース別収益</h2>
            </div>
            {data?.byCourse && data.byCourse.length > 0 ? (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">コース名</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">売上（税込）</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">手取り</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">販売数</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">種別</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byCourse.map((course) => (
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
                        ¥{course.grossRevenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        ¥{course.netRevenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">{course.salesCount}件</td>
                      <td className="px-4 py-3 text-right">
                        {course.isSubscription ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                            サブスク
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                            PPV
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>まだ販売データがありません</p>
              </div>
            )}
          </div>

          {/* Payout Info */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              支払いについて
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>• 収益は毎月末に確定し、翌月末に登録された銀行口座へ振り込まれます。</p>
              <p>• 最低支払金額は¥1,000です。未払い残高が最低金額に達していない場合、翌月に繰り越されます。</p>
              <p>• 振込手数料はプラットフォームが負担します。</p>
              <p>• 請求書と支払い明細は自動生成され、ダッシュボードからダウンロードできます。</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
