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
  Users,
  Loader2,
  Download,
  Calendar,
  Shield,
} from 'lucide-react';

interface MonthlyRevenue {
  month: string;
  totalRevenue: number;
  transactionCount: number;
  uniqueBuyers: number;
}

export default function AdminRevenuePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchRevenue();
    }
  }, [authLoading, isAuthenticated, user?.role]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      // Use admin revenue API
      const response = await fetch(
        'https://elearning-api.atsunari-coda.workers.dev/v1/admin/revenue',
        {
          headers: {
            Authorization: `Bearer ${api.getToken()}`,
          },
        }
      );
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data.monthly || []);
      } else {
        setError(result.error?.message || '収益データの取得に失敗しました');
      }
    } catch (err) {
      setError('収益データの取得に失敗しました');
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // Calculate totals
  const totalRevenue = data.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalTransactions = data.reduce((sum, m) => sum + m.transactionCount, 0);
  const totalBuyers = data.reduce((sum, m) => sum + m.uniqueBuyers, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">収益レポート</h1>
                <p className="text-gray-600 text-sm mt-1">プラットフォーム全体の収益を確認</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              CSVダウンロード
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      ¥{totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">総収益</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalTransactions}件</p>
                    <p className="text-sm text-gray-500">総取引数</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalBuyers}人</p>
                    <p className="text-sm text-gray-500">購入者数（延べ）</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Revenue Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">月別収益</h2>
              </div>
              {data.length > 0 ? (
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
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((month) => (
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
                          ¥
                          {month.transactionCount > 0
                            ? Math.round(month.totalRevenue / month.transactionCount).toLocaleString()
                            : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>まだ収益データがありません</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
