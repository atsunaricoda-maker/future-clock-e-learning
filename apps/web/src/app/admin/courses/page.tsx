'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  Check,
  X,
  Eye,
  Star,
  Users,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  isPublished: boolean;
  totalEnrollments: number;
  averageRating: number;
  isSubsidyEligible: boolean;
  instructorName: string;
  instructorEmail: string;
  createdAt: string;
}

export default function AdminCoursesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [rejectModal, setRejectModal] = useState<{ courseId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchCourses();
    }
  }, [authLoading, isAuthenticated, user?.role, pagination.page, statusFilter]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminCourses({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        setCourses(response.data.courses);
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: string) => {
    try {
      const response = await api.approveCourse(courseId);
      if (response.success) {
        fetchCourses();
      }
    } catch (err) {
      console.error('Failed to approve course:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason) return;
    try {
      const response = await api.rejectCourse(rejectModal.courseId, rejectReason);
      if (response.success) {
        setRejectModal(null);
        setRejectReason('');
        fetchCourses();
      }
    } catch (err) {
      console.error('Failed to reject course:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800' },
      pending_review: { label: '審査待ち', className: 'bg-yellow-100 text-yellow-800' },
      published: { label: '公開中', className: 'bg-green-100 text-green-800' },
      unpublished: { label: '非公開', className: 'bg-gray-100 text-gray-800' },
      rejected: { label: '却下', className: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <Shield className="h-6 w-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">コース管理</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">すべてのステータス</option>
              <option value="draft">下書き</option>
              <option value="pending_review">審査待ち</option>
              <option value="published">公開中</option>
              <option value="rejected">却下</option>
            </select>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">コースが見つかりません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      コース
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      講師
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      価格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      受講者
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {course.isSubsidyEligible && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                助成金対応
                              </span>
                            )}
                            {course.averageRating > 0 && (
                              <span className="flex items-center text-xs text-gray-500">
                                <Star className="h-3 w-3 text-yellow-400 mr-1" />
                                {course.averageRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">{course.instructorName || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{course.instructorEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(course.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {course.price === 0 ? '無料' : `¥${course.price.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          {course.totalEnrollments}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/courses/${course.slug}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {course.status === 'pending_review' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(course.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejectModal({ courseId: course.id, title: course.title })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">コースを却下</h3>
            <p className="text-sm text-gray-500 mb-4">
              「{rejectModal.title}」を却下します。却下理由を入力してください。
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="却下理由を入力..."
              className="w-full border rounded-lg px-3 py-2 mb-4 h-24 resize-none"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectModal(null)}>
                キャンセル
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectReason}
                className="bg-red-600 hover:bg-red-700"
              >
                却下する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
