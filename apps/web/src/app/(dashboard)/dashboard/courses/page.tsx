'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Clock, 
  Play,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function MyCoursesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        window.location.href = '/sign-in?redirect=/dashboard/courses';
      }
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const courses = [
    {
      id: 'course-1',
      title: 'Pythonで学ぶAI入門',
      instructor: '山田太郎',
      progress: 65,
      totalLectures: 45,
      completedLectures: 29,
      totalDuration: '10時間',
      lastAccess: '2時間前',
      thumbnail: null,
    },
    {
      id: 'course-2',
      title: 'Webデザインの基礎',
      instructor: '山田太郎',
      progress: 30,
      totalLectures: 35,
      completedLectures: 10,
      totalDuration: '8時間',
      lastAccess: '昨日',
      thumbnail: null,
    },
    {
      id: 'course-3',
      title: 'ビジネス英語マスター',
      instructor: '山田太郎',
      progress: 85,
      totalLectures: 60,
      completedLectures: 51,
      totalDuration: '12時間',
      lastAccess: '3日前',
      thumbnail: null,
    },
  ];

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
        {['すべて', '受講中', '完了'].map((tab, index) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              index === 0
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="w-48 h-28 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/courses/${course.id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{course.instructor}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{course.lastAccess}</span>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{course.completedLectures}/{course.totalLectures} レッスン完了</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-4">
                  <Link href={`/courses/${course.id}`}>
                    <Button size="sm" className="gap-2">
                      <Play className="h-4 w-4" />
                      学習を続ける
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {course.totalDuration}
                  </div>
                  {course.progress === 100 && (
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

      {courses.length === 0 && (
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
