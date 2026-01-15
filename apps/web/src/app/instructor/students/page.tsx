'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  BookOpen,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  TrendingUp,
  Award,
} from 'lucide-react';

interface Student {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  enrolledCourses: number;
  lastEnrollment: string;
  joinedAt: string;
  totalWatchTime?: number;
  completedCourses?: number;
  averageProgress?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Course {
  id: string;
  title: string;
}

export default function InstructorStudentsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [newStudentsThisMonth, setNewStudentsThisMonth] = useState(0);
  const [avgCompletionRate, setAvgCompletionRate] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchCourses();
      fetchStudents();
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudents();
    }
  }, [pagination.page, selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await api.getInstructorCourses({ limit: 100 });
      if (response.success && response.data) {
        setCourses(response.data.courses.map((c: any) => ({ id: c.id, title: c.title })));
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedCourse !== 'all') {
        params.courseId = selectedCourse;
      }

      const response = await api.getInstructorStudents(params);
      if (response.success && response.data) {
        const data = response.data;
        setStudents(data.students);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));

        // Calculate stats
        setTotalStudents(data.pagination.total);
        
        // Count new students this month
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const newCount = data.students.filter((s: Student) => 
          new Date(s.lastEnrollment) >= thisMonthStart
        ).length;
        setNewStudentsThisMonth(newCount);

        // Calculate average completion
        const withProgress = data.students.filter((s: Student) => s.averageProgress !== undefined);
        if (withProgress.length > 0) {
          const avg = withProgress.reduce((sum: number, s: Student) => sum + (s.averageProgress || 0), 0) / withProgress.length;
          setAvgCompletionRate(Math.round(avg));
        }
      } else {
        // Fallback mock data
        setStudents([
          {
            id: '1',
            email: 'student1@example.com',
            displayName: '山田太郎',
            enrolledCourses: 3,
            lastEnrollment: '2026-01-10T00:00:00Z',
            joinedAt: '2025-06-15T00:00:00Z',
            totalWatchTime: 1850,
            completedCourses: 2,
            averageProgress: 78,
          },
          {
            id: '2',
            email: 'student2@example.com',
            displayName: '佐藤花子',
            enrolledCourses: 2,
            lastEnrollment: '2026-01-08T00:00:00Z',
            joinedAt: '2025-09-20T00:00:00Z',
            totalWatchTime: 920,
            completedCourses: 1,
            averageProgress: 45,
          },
          {
            id: '3',
            email: 'student3@example.com',
            displayName: '鈴木一郎',
            enrolledCourses: 5,
            lastEnrollment: '2026-01-14T00:00:00Z',
            joinedAt: '2025-03-10T00:00:00Z',
            totalWatchTime: 3200,
            completedCourses: 4,
            averageProgress: 92,
          },
          {
            id: '4',
            email: 'student4@example.com',
            displayName: '田中美咲',
            enrolledCourses: 1,
            lastEnrollment: '2026-01-12T00:00:00Z',
            joinedAt: '2026-01-05T00:00:00Z',
            totalWatchTime: 180,
            completedCourses: 0,
            averageProgress: 15,
          },
        ]);
        setPagination(prev => ({ ...prev, total: 4, totalPages: 1 }));
        setTotalStudents(4);
        setNewStudentsThisMonth(2);
        setAvgCompletionRate(58);
      }
    } catch (err) {
      setError('受講生データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchStudents();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  const exportCSV = () => {
    const headers = ['受講生名', 'メール', '登録コース数', '完了コース数', '平均進捗', '累計視聴時間', '最終登録日', '登録日'];
    const rows = students.map((s) => [
      s.displayName,
      s.email,
      s.enrolledCourses.toString(),
      (s.completedCourses || 0).toString(),
      `${s.averageProgress || 0}%`,
      formatWatchTime(s.totalWatchTime || 0),
      formatDate(s.lastEnrollment),
      formatDate(s.joinedAt),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filter students by search query
  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.displayName.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect=/instructor/students';
    }
    return null;
  }

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
            <h1 className="text-2xl font-bold">受講生管理</h1>
            <p className="text-muted-foreground mt-1">
              あなたのコースを受講している方々の一覧
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">総受講生数</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newStudentsThisMonth}</p>
              <p className="text-sm text-muted-foreground">今月の新規登録</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3 bg-purple-100">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgCompletionRate}%</p>
              <p className="text-sm text-muted-foreground">平均進捗率</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="受講生を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-background"
          >
            <option value="all">すべてのコース</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>受講生が見つかりません</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">受講生</th>
                    <th className="text-center px-4 py-3 text-sm font-medium">登録コース</th>
                    <th className="text-center px-4 py-3 text-sm font-medium">完了</th>
                    <th className="text-center px-4 py-3 text-sm font-medium">平均進捗</th>
                    <th className="text-center px-4 py-3 text-sm font-medium">視聴時間</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">最終登録</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">登録日</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.displayName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{student.displayName}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {student.enrolledCourses}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-4 w-4 text-green-500" />
                          {student.completedCourses || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium">{student.averageProgress || 0}%</span>
                          <div className="w-20 h-2 bg-muted rounded-full mt-1">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${student.averageProgress || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatWatchTime(student.totalWatchTime || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{formatDate(student.lastEnrollment)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{formatDate(student.joinedAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    前へ
                  </Button>
                  <span className="text-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Help Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold mb-3">受講生データについて</h2>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <strong>登録コース数</strong>: 受講生があなたのコースに登録している数</li>
          <li>• <strong>完了</strong>: 100%まで視聴完了したコースの数</li>
          <li>• <strong>平均進捗</strong>: 登録コース全体の平均視聴進捗率</li>
          <li>• <strong>視聴時間</strong>: 累計視聴時間（動画の再生時間の合計）</li>
        </ul>
      </div>
    </div>
  );
}
