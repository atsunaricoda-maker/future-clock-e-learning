'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
  Play, 
  Clock, 
  Star, 
  Award, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText,
  Video
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatarUrl?: string;
    headline?: string;
  };
  category: {
    id: string;
    name: string;
  };
  level: string;
  price: number;
  currency: string;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  totalDuration: number;
  totalLectures: number;
  thumbnailUrl?: string;
  sections?: Section[];
  whatYouWillLearn?: string[];
  requirements?: string[];
}

interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Lecture {
  id: string;
  title: string;
  contentType: 'video' | 'quiz' | 'document';
  duration?: number;
  isFree: boolean;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (params.id) {
      loadCourse(params.id as string);
    }
  }, [params.id]);

  const loadCourse = async (id: string) => {
    setIsLoading(true);
    const response = await api.getCourse(id);
    if (response.success && response.data) {
      setCourse(response.data);
      // Expand first section by default
      if (response.data.sections?.length > 0) {
        setExpandedSections(new Set([response.data.sections[0].id]));
      }
    }
    setIsLoading(false);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
      all_levels: '全レベル',
    };
    return labels[level] || level;
  };

  const handleEnroll = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    // TODO: Implement enrollment/purchase flow
    alert('購入機能は実装予定です');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">コースが見つかりません</h1>
            <Link href="/courses" className="text-primary hover:underline mt-4 inline-block">
              コース一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use API sections or fallback to empty
  const sections: Section[] = course.sections || [];

  const whatYouWillLearn = course.whatYouWillLearn || [
    'プログラミングの基礎概念を理解できる',
    '実践的なコードを書けるようになる',
    '問題解決能力が身につく',
    '実務で使えるスキルが習得できる',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="text-sm text-slate-300 mb-2">
                  <Link href="/courses" className="hover:text-white">コース</Link>
                  {' > '}
                  <Link href={`/courses?category=${course.category.id}`} className="hover:text-white">
                    {course.category.name}
                  </Link>
                </div>
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <p className="text-xl text-slate-300 mt-2">{course.subtitle}</p>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(course.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-slate-300">({course.totalReviews} レビュー)</span>
                  </div>
                  <span className="text-slate-300">
                    {course.totalEnrollments.toLocaleString()}人が受講中
                  </span>
                </div>

                <p className="mt-4">
                  講師: <Link href={`/instructors/${course.instructor.id}`} className="text-primary hover:underline">{course.instructor.name}</Link>
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.totalDuration)}
                  </span>
                  <span>{course.totalLectures}レッスン</span>
                  <span>{getLevelLabel(course.level)}</span>
                </div>
              </div>

              {/* Price Card - Desktop */}
              <div className="hidden lg:block">
                <div className="bg-white text-foreground rounded-xl shadow-lg overflow-hidden sticky top-24">
                  <div className="aspect-video bg-muted relative">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <button className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-colors">
                      <div className="rounded-full bg-white p-4">
                        <Play className="h-8 w-8 text-primary fill-primary" />
                      </div>
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="text-3xl font-bold">
                      {formatPrice(course.price, course.currency)}
                    </div>
                    <Button className="w-full mt-4" size="lg" onClick={handleEnroll}>
                      このコースを購入する
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      30日間返金保証
                    </p>
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(course.totalDuration)}の動画コンテンツ
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {course.totalLectures}レッスン
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        修了証発行
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Price Bar */}
        <div className="lg:hidden sticky top-16 z-40 bg-background border-b p-4">
          <div className="container flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatPrice(course.price, course.currency)}
            </span>
            <Button onClick={handleEnroll}>購入する</Button>
          </div>
        </div>

        {/* Content */}
        <section className="py-12">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* What you'll learn */}
                <div className="rounded-xl border p-6">
                  <h2 className="text-xl font-bold mb-4">このコースで学べること</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {whatYouWillLearn.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Course Content */}
                <div>
                  <h2 className="text-xl font-bold mb-4">コース内容</h2>
                  <div className="text-sm text-muted-foreground mb-4">
                    {sections.length}セクション・{course.totalLectures}レッスン・{formatDuration(course.totalDuration)}
                  </div>
                  <div className="border rounded-xl overflow-hidden">
                    {sections.map((section, index) => (
                      <div key={section.id} className={index > 0 ? 'border-t' : ''}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-left">
                            {expandedSections.has(section.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-medium">{section.title}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {section.lectures.length}レッスン
                          </span>
                        </button>
                        {expandedSections.has(section.id) && (
                          <div className="border-t bg-muted/30">
                            {section.lectures.map((lecture) => (
                              <div
                                key={lecture.id}
                                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {lecture.contentType === 'video' ? (
                                    <Video className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-sm">{lecture.title}</span>
                                  {lecture.isFree && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      プレビュー
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {lecture.duration && formatDuration(lecture.duration)}
                                  {!lecture.isFree && <Lock className="h-4 w-4" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h2 className="text-xl font-bold mb-4">コース説明</h2>
                  <div className="prose prose-sm max-w-none">
                    <p>{course.description || course.subtitle}</p>
                  </div>
                </div>

                {/* Instructor */}
                <div>
                  <h2 className="text-xl font-bold mb-4">講師</h2>
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      {course.instructor.avatarUrl ? (
                        <img
                          src={course.instructor.avatarUrl}
                          alt={course.instructor.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {course.instructor.name[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/instructors/${course.instructor.id}`}
                        className="text-lg font-semibold text-primary hover:underline"
                      >
                        {course.instructor.name}
                      </Link>
                      {course.instructor.headline && (
                        <p className="text-muted-foreground">{course.instructor.headline}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
