'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  PlayCircle,
  FileText,
  Clock,
  Menu,
  X,
  Loader2,
  Lock,
} from 'lucide-react';

interface Lecture {
  id: string;
  title: string;
  duration: number;
  contentType: string;
  isCompleted?: boolean;
  isFree: boolean;
}

interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  sections: Section[];
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  
  const courseId = params.id as string;
  const lectureId = params.lectureId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [progress, setProgress] = useState<Map<string, boolean>>(new Map());
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        router.push(`/sign-in?redirect=/courses/${courseId}/learn/${lectureId}`);
      }
    }
  }, [authLoading, isAuthenticated, courseId, lectureId, router]);

  useEffect(() => {
    if (isAuthenticated && courseId) {
      fetchCourseData();
    }
  }, [isAuthenticated, courseId]);

  useEffect(() => {
    if (course && lectureId) {
      findAndSetCurrentLecture();
      fetchVideoUrl();
    }
  }, [course, lectureId]);

  const fetchCourseData = async () => {
    try {
      // コース情報を取得
      const courseResponse = await api.getCourse(courseId);
      if (courseResponse.success && courseResponse.data) {
        setCourse({
          id: courseResponse.data.id,
          title: courseResponse.data.title,
          sections: courseResponse.data.sections || [],
        });
      } else {
        setError('コースが見つかりません');
        return;
      }

      // 受講登録確認
      const progressResponse = await api.getCourseProgress(courseId);
      if (progressResponse.success) {
        setIsEnrolled(true);
      }

      // 講義の進捗を取得
      const lecturesProgressResponse = await api.getLecturesProgress(courseId);
      if (lecturesProgressResponse.success && lecturesProgressResponse.data) {
        const progressMap = new Map<string, boolean>();
        lecturesProgressResponse.data.lectures.forEach((lp) => {
          progressMap.set(lp.lectureId, lp.isCompleted);
        });
        setProgress(progressMap);
      }
    } catch (err) {
      console.error('Failed to fetch course:', err);
      setError('コースの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const findAndSetCurrentLecture = () => {
    if (!course) return;
    
    for (const section of course.sections) {
      const lecture = section.lectures.find(l => l.id === lectureId);
      if (lecture) {
        setCurrentLecture({
          ...lecture,
          isCompleted: progress.get(lecture.id),
        });
        return;
      }
    }
  };

  const fetchVideoUrl = async () => {
    try {
      const response = await api.getVideoPlaybackUrl(lectureId);
      if (response.success && response.data) {
        setVideoUrl(response.data.playbackUrl);
        setThumbnailUrl(response.data.thumbnailUrl);
      }
    } catch (err) {
      console.error('Failed to fetch video URL:', err);
    }
  };

  const handleVideoProgress = useCallback((currentTime: number, duration: number) => {
    // 80%以上視聴したら完了とみなす
    if (currentTime / duration >= 0.8 && currentLecture && !progress.get(currentLecture.id)) {
      handleCompleteLecture();
    }
  }, [currentLecture, progress]);

  const handleCompleteLecture = async () => {
    if (!currentLecture) return;
    
    try {
      const response = await api.completeLecture(courseId, currentLecture.id, currentLecture.duration);
      if (response.success) {
        setProgress(prev => new Map(prev).set(currentLecture.id, true));
        setCurrentLecture({ ...currentLecture, isCompleted: true });
      }
    } catch (err) {
      console.error('Failed to complete lecture:', err);
    }
  };

  const getAdjacentLectures = () => {
    if (!course) return { prev: null, next: null };
    
    const allLectures: { lecture: Lecture; sectionId: string }[] = [];
    course.sections.forEach(section => {
      section.lectures.forEach(lecture => {
        allLectures.push({ lecture, sectionId: section.id });
      });
    });

    const currentIndex = allLectures.findIndex(l => l.lecture.id === lectureId);
    
    return {
      prev: currentIndex > 0 ? allLectures[currentIndex - 1] : null,
      next: currentIndex < allLectures.length - 1 ? allLectures[currentIndex + 1] : null,
    };
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/courses/${courseId}`}>
            <Button>コースページに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { prev, next } = getAdjacentLectures();

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-gray-800 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Link href={`/courses/${courseId}`} className="text-blue-400 hover:text-blue-300 text-sm">
                ← コースに戻る
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-white font-semibold mt-2 line-clamp-2">{course?.title}</h2>
          </div>

          {/* Sections */}
          <div className="p-2">
            {course?.sections.map((section, sectionIndex) => (
              <div key={section.id} className="mb-2">
                <div className="px-3 py-2 text-sm font-medium text-gray-400">
                  セクション {sectionIndex + 1}: {section.title}
                </div>
                <div className="space-y-1">
                  {section.lectures.map((lecture, lectureIndex) => {
                    const isCompleted = progress.get(lecture.id);
                    const isCurrent = lecture.id === lectureId;
                    const canAccess = isEnrolled || lecture.isFree;

                    return (
                      <Link
                        key={lecture.id}
                        href={canAccess ? `/courses/${courseId}/learn/${lecture.id}` : '#'}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-blue-600/20 text-blue-400'
                            : canAccess
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-500 cursor-not-allowed'
                        }`}
                        onClick={e => !canAccess && e.preventDefault()}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : canAccess ? (
                          <Circle className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <Lock className="h-5 w-5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {sectionIndex + 1}.{lectureIndex + 1} {lecture.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {lecture.contentType === 'video' ? (
                              <PlayCircle className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            <span>{formatDuration(lecture.duration)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-gray-800 p-2 rounded-lg text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Video Player */}
        <div className="w-full max-w-5xl mx-auto">
          {videoUrl ? (
            <VideoPlayer
              src={videoUrl}
              poster={thumbnailUrl || undefined}
              title={currentLecture?.title}
              onProgress={handleVideoProgress}
              onComplete={handleCompleteLecture}
            />
          ) : (
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <p className="text-gray-400">動画を読み込み中...</p>
            </div>
          )}
        </div>

        {/* Lecture Info */}
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">{currentLecture?.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {currentLecture && formatDuration(currentLecture.duration)}
                </span>
                {currentLecture?.isCompleted && (
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    完了
                  </span>
                )}
              </div>
            </div>

            {!currentLecture?.isCompleted && (
              <Button onClick={handleCompleteLecture}>
                <CheckCircle className="h-4 w-4 mr-2" />
                完了としてマーク
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 border-t border-gray-700 pt-6">
            {prev ? (
              <Link href={`/courses/${courseId}/learn/${prev.lecture.id}`}>
                <Button variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  前の講義
                </Button>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link href={`/courses/${courseId}/learn/${next.lecture.id}`}>
                <Button className="gap-2">
                  次の講義
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/courses/${courseId}`}>
                <Button className="gap-2">
                  コースを完了
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
