'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Clock, 
  Play,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface EnrolledCourse {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  enrolledAt: string;
  totalLectures: number;
  completedLectures: number;
  progressPercent: number;
  totalWatchTime: number;
  isCompleted: boolean;
}

export default function MyCoursesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        window.location.href = '/sign-in?redirect=/dashboard/courses';
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMyCourses();
    }
  }, [isAuthenticated, user]);

  const fetchMyCourses = async () => {
    try {
      const response = await api.getMyProgress();
      if (response.success && response.data) {
        setCourses(response.data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredCourses = courses.filter(course => {
    if (filter === 'completed') return course.isCompleted;
    if (filter === 'in_progress') return !course.isCompleted && course.progressPercent > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">マイコース</h1>
          <p className="text-muted-foreground">受講中のコース一覧</p>
        </div>
        <Link href="/courses">
          <Button>
            <BookOpen className="h-4 w-4 mr-2" />
            コースを探す
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'all', label: 'すべて' },
          { key: 'in_progress', label: '受講中' },
          { key: 'completed', label: '完了' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course List */}
      {loadingCourses ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <div
              key={course.courseId}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-48 h-28 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/courses/${course.courseId}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        登録日: {new Date(course.enrolledAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{course.completedLectures}/{course.totalLectures} レッスン完了</span>
                      <span className="font-medium">{course.progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-4">
                    <Link href={`/courses/${course.courseId}`}>
                      <Button size="sm" className="gap-2">
                        <Play className="h-4 w-4" />
                        {course.isCompleted ? 'もう一度見る' : '学習を続ける'}
                      </Button>
                    </Link>
                    {course.totalWatchTime > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatWatchTime(course.totalWatchTime)}学習済み
                      </div>
                    )}
                    {course.isCompleted && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        完了
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingCourses && filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">まだコースを受講していません</h3>
          <p className="text-muted-foreground mb-4">
            興味のあるコースを見つけて、学習を始めましょう
          </p>
          <Link href="/courses">
            <Button>コースを探す</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
