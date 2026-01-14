'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Filter,
  XCircle,
} from 'lucide-react';

interface Enrollment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  progressPercent: number;
  isCompleted: boolean;
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, _setCourseFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchEnrollments();
  }, [pagination.page, courseFilter]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminEnrollments({
        page: pagination.page,
        limit: pagination.limit,
        courseId: courseFilter || undefined,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setEnrollments(response.data.enrollments);
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEnrollments();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      paid: { label: '支払い済み', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      pending: { label: '保留中', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      free: { label: '無料', className: 'bg-blue-100 text-blue-800', icon: <DollarSign className="h-3 w-3" /> },
      refunded: { label: '返金済み', className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getProgressBar = (percent: number, isCompleted: boolean) => {
    const bgColor = isCompleted ? 'bg-green-500' : percent > 50 ? 'bg-blue-500' : 'bg-yellow-500';
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
            {isCompleted ? '修了' : `${percent}%`}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${bgColor} transition-all`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const handleExportCSV = () => {
    const headers = ['登録日', 'ユーザー', 'メール', 'コース', '支払い状況', '金額', '進捗', '修了'];
    const rows = enrollments.map(e => [
      new Date(e.enrolledAt).toLocaleDateString('ja-JP'),
      e.userName,
      e.userEmail,
      e.courseTitle,
      e.paymentStatus,
      e.amount > 0 ? `¥${e.amount}` : '無料',
      `${e.progressPercent}%`,
      e.isCompleted ? 'はい' : 'いいえ'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `enrollments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const completedCount = enrollments.filter(e => e.isCompleted).length;
  const paidCount = enrollments.filter(e => e.paymentStatus === 'paid').length;
  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.paymentStatus === 'paid' ? e.amount : 0), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">受講登録</h1>
          <p className="text-gray-500 mt-1">すべての受講登録を管理</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          CSV出力
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pagination.total || totalEnrollments}</p>
              <p className="text-xs text-gray-500">総登録数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs text-gray-500">修了者数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{paidCount}</p>
              <p className="text-xs text-gray-500">有料登録</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¥{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">表示中の売上</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ユーザー名またはメールで検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={handleSearch} className="gap-2">
            <Filter className="h-4 w-4" />
            検索
          </Button>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">受講登録が見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コース
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払い
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    進捗
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {enrollment.userName || '名前未設定'}
                          </p>
                          <p className="text-xs text-gray-500">{enrollment.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-[250px]">
                        <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 truncate" title={enrollment.courseTitle}>
                          {enrollment.courseTitle}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(enrollment.enrolledAt).toLocaleDateString('ja-JP')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(enrollment.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {enrollment.amount > 0 ? `¥${enrollment.amount.toLocaleString()}` : '無料'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getProgressBar(enrollment.progressPercent, enrollment.isCompleted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-600">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
