'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Star,
  Users,
  Clock
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  status: 'draft' | 'pending_review' | 'published' | 'unpublished';
  price: number;
  currency: string;
  totalEnrollments: number;
  averageRating: number;
  totalLectures: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

export default function InstructorCoursesPage() {
  useAuth(); // Ensure user is authenticated
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    // TODO: Add instructor filter to API
    const response = await api.getCourses();
    if (response.success && response.data) {
      setCourses(response.data.courses);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">公開中</span>;
      case 'draft':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">下書き</span>;
      case 'pending_review':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">審査中</span>;
      case 'unpublished':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">非公開</span>;
      default:
        return null;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const filteredCourses = courses.filter((course) => {
    if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && course.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">コース管理</h1>
          <p className="text-muted-foreground mt-1">
            作成したコースの管理・編集ができます
          </p>
        </div>
        <Link href="/instructor/courses/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規コース作成
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="コースを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">すべてのステータス</option>
          <option value="published">公開中</option>
          <option value="draft">下書き</option>
          <option value="pending_review">審査中</option>
          <option value="unpublished">非公開</option>
        </select>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 rounded-xl border bg-card">
          <p className="text-muted-foreground mb-4">コースがありません</p>
          <Link href="/instructor/courses/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              最初のコースを作成する
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-40 h-24 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">No Image</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link 
                        href={`/instructor/courses/${course.id}`}
                        className="font-semibold hover:text-primary line-clamp-1"
                      >
                        {course.title}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {course.subtitle}
                      </p>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.totalEnrollments?.toLocaleString() || 0}人
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400" />
                      {course.averageRating?.toFixed(1) || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(course.totalDuration || 0)}
                    </span>
                    <span>
                      {course.totalLectures || 0}レッスン
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Link href={`/instructor/courses/${course.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit className="h-4 w-4" />
                        編集
                      </Button>
                    </Link>
                    <Link href={`/courses/${course.id}`} target="_blank">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        プレビュー
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
