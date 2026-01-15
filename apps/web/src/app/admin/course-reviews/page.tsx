'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  Calendar,
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface PendingCourse {
  id: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  instructorId: string;
  instructorName: string;
  instructorEmail?: string;
  categoryName?: string;
  level: string;
  price: number;
  currency: string;
  totalLectures: number;
  totalDuration: number;
  submittedAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export default function AdminCourseReviewsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review');
  const [selectedCourse, setSelectedCourse] = useState<PendingCourse | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin'))) {
      router.push('/admin');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchCourses();
    }
  }, [isAuthenticated, user, statusFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminCourses({ status: statusFilter === 'all' ? undefined : statusFilter });
      if (response.success && response.data) {
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: string) => {
    if (!confirm('このコースを承認しますか？公開されます。')) return;

    try {
      setProcessing(true);
      const response = await api.approveCourse(courseId);
      if (response.success) {
        await fetchCourses();
        alert('コースを承認しました');
      }
    } catch (error) {
      console.error('Failed to approve course:', error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCourse || !rejectReason.trim()) return;

    try {
      setProcessing(true);
      const response = await api.rejectCourse(selectedCourse.id, rejectReason);
      if (response.success) {
        setShowRejectModal(false);
        setSelectedCourse(null);
        setRejectReason('');
        await fetchCourses();
        alert('コースを却下しました');
      }
    } catch (error) {
      console.error('Failed to reject course:', error);
      alert('却下に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const formatPrice = (price: number, currency?: string) => {
    if (price === 0) return '無料';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: currency || 'JPY' }).format(price);
  };

  const levelLabels: Record<string, string> = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級',
    all_levels: '全レベル',
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3" />
            審査待ち
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            承認済み
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" />
            却下
          </span>
        );
      default:
        return null;
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">コース審査</h1>
                <p className="text-sm text-muted-foreground">講師から提出されたコースを審査します</p>
              </div>
            </div>
            <Link href="/admin">
              <Button variant="outline">ダッシュボードに戻る</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="コース名または講師名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-48 px-3 py-2 border rounded-lg bg-white text-sm appearance-none pr-10"
            >
              <option value="pending_review">審査待ちのみ</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
              <option value="all">すべて</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === 'pending_review').length}</p>
                <p className="text-sm text-muted-foreground">審査待ち</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">今月承認</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === 'rejected').length}</p>
                <p className="text-sm text-muted-foreground">今月却下</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? '検索結果がありません' : '審査待ちのコースはありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="w-full lg:w-48 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(course.status)}
                          {course.categoryName && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{course.categoryName}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{course.title}</h3>
                        {course.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2">{course.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">講師</span>
                        <p className="font-medium flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {course.instructorName}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">レベル</span>
                        <p className="font-medium">{levelLabels[course.level] || course.level}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">レクチャー数</span>
                        <p className="font-medium">{course.totalLectures}本</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">総時間</span>
                        <p className="font-medium">{formatDuration(course.totalDuration)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-lg">{formatPrice(course.price, course.currency)}</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(course.submittedAt).toLocaleDateString('ja-JP')} 提出
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/courses/${course.id}`} target="_blank">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            プレビュー
                          </Button>
                        </Link>
                        {course.status === 'pending_review' && (
                          <>
                            <Button
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(course.id)}
                              disabled={processing}
                            >
                              <CheckCircle className="h-4 w-4" />
                              承認
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedCourse(course);
                                setShowRejectModal(true);
                              }}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4" />
                              却下
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {course.status === 'rejected' && course.rejectionReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          <strong>却下理由:</strong> {course.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">コースを却下</h3>
            <p className="text-sm text-muted-foreground mb-4">
              「{selectedCourse.title}」を却下します。講師に却下理由を伝えてください。
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">却下理由 *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="却下理由を入力してください..."
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  却下する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
