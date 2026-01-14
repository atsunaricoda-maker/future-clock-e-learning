'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Loader2,
  Download,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
} from 'lucide-react';

interface MonthlyRevenue {
  month: string;
  totalRevenue: number;
  transactionCount: number;
  uniqueBuyers: number;
}

interface TopCourse {
  courseId: string;
  courseTitle: string;
  revenue: number;
  salesCount: number;
}

export default function AdminRevenuePage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '365'>('90');

  useEffect(() => {
    fetchRevenue();
  }, [dateRange]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://elearning-api.atsunari-coda.workers.dev/v1/admin/revenue?days=${dateRange}`,
        {
          headers: {
            Authorization: `Bearer ${api.getToken()}`,
          },
        }
      );
      const result = await response.json();
      if (result.success && result.data) {
        setMonthlyData(result.data.monthly || []);
        setTopCourses(result.data.topCourses || []);
      } else {
        setError(result.error?.message || '収益データの取得に失敗しました');
      }
    } catch (err) {
      setError('収益データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // Calculate totals and trends
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalTransactions = monthlyData.reduce((sum, m) => sum + m.transactionCount, 0);
  const totalBuyers = monthlyData.reduce((sum, m) => sum + m.uniqueBuyers, 0);
  
  // Calculate month-over-month growth
  const currentMonthRevenue = monthlyData[0]?.totalRevenue || 0;
  const lastMonthRevenue = monthlyData[1]?.totalRevenue || 0;
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : '0';
  const isGrowthPositive = parseFloat(revenueGrowth) >= 0;

  // Calculate average per transaction
  const avgTransactionValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...monthlyData.map(m => m.totalRevenue), 1);

  const handleDownloadCSV = () => {
    const headers = ['月', '収益', '取引数', '購入者数', '平均単価'];
    const rows = monthlyData.map(m => [
      formatMonth(m.month),
      m.totalRevenue,
      m.transactionCount,
      m.uniqueBuyers,
      m.transactionCount > 0 ? Math.round(m.totalRevenue / m.transactionCount) : 0
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">収益レポート</h1>
          <p className="text-gray-500 mt-1">プラットフォーム全体の収益を分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: '30', label: '30日' },
              { value: '90', label: '90日' },
              { value: '365', label: '1年' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  dateRange === option.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="gap-2" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${isGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isGrowthPositive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {revenueGrowth}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ¥{totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">総収益</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions}件</p>
              <p className="text-sm text-gray-500 mt-1">総取引数</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalBuyers}人</p>
              <p className="text-sm text-gray-500 mt-1">購入者数（延べ）</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">¥{avgTransactionValue.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">平均取引額</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  月別収益推移
                </h2>
              </div>
              
              {monthlyData.length > 0 ? (
                <div className="space-y-3">
                  {monthlyData.slice().reverse().map((month) => (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600 font-medium">
                        {formatMonth(month.month).replace('年', '/').replace('月', '')}
                      </div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-end pr-2"
                          style={{ width: `${(month.totalRevenue / maxRevenue) * 100}%` }}
                        >
                          {month.totalRevenue > 0 && (
                            <span className="text-xs text-white font-medium">
                              ¥{month.totalRevenue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500">
                  データがありません
                </div>
              )}
            </div>

            {/* Top Courses */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <PieChart className="h-5 w-5 text-green-600" />
                売上上位コース
              </h2>
              
              {topCourses.length > 0 ? (
                <div className="space-y-4">
                  {topCourses.slice(0, 5).map((course, index) => (
                    <div key={course.courseId} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {course.courseTitle}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="text-green-600 font-medium">¥{course.revenue.toLocaleString()}</span>
                          <span>{course.salesCount}件</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  データがありません
                </div>
              )}
            </div>
          </div>

          {/* Monthly Revenue Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
            <div className="p-4 border-b flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">月別詳細</h2>
            </div>
            {monthlyData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">月</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        収益
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        取引数
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        購入者数
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        平均単価
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        前月比
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyData.map((month, index) => {
                      const prevMonth = monthlyData[index + 1];
                      const growth = prevMonth && prevMonth.totalRevenue > 0
                        ? ((month.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue * 100).toFixed(1)
                        : null;
                      const isPositive = growth ? parseFloat(growth) >= 0 : true;
                      
                      return (
                        <tr key={month.month} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatMonth(month.month)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            ¥{month.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {month.transactionCount}件
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {month.uniqueBuyers}人
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            ¥{month.transactionCount > 0
                              ? Math.round(month.totalRevenue / month.transactionCount).toLocaleString()
                              : 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {growth !== null ? (
                              <span className={`flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {growth}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>まだ収益データがありません</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
