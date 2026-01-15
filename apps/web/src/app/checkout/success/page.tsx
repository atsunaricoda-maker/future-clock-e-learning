'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  CheckCircle2,
  Play,
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  Download,
  Mail,
  Loader2,
  AlertCircle,
  PartyPopper,
  Share2,
  Twitter,
  Facebook
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  thumbnailUrl?: string;
  instructor: {
    id: string;
    name: string;
  };
  totalDuration: number;
  totalLectures: number;
  level: string;
  sections?: Array<{
    id: string;
    title: string;
    lectures: Array<{
      id: string;
      title: string;
    }>;
  }>;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  const courseId = searchParams.get('courseId');
  const sessionId = searchParams.get('session_id');
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    if (courseId) {
      loadCourse(courseId);
      // 支払い確認処理
      if (sessionId && !paymentConfirmed) {
        confirmPayment(sessionId);
      }
      // Trigger confetti animation
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);
    }
  }, [courseId, sessionId, isAuthenticated, authLoading, router, paymentConfirmed]);

  const confirmPayment = async (sessionId: string) => {
    try {
      const response = await api.confirmPayment(sessionId);
      if (response.success) {
        setPaymentConfirmed(true);
        console.log('Payment confirmed:', response.data);
      }
    } catch (err) {
      // 既に確認済みの場合はエラーを無視
      console.log('Payment may already be confirmed');
    }
  };

  const loadCourse = async (id: string) => {
    setIsLoading(true);
    const response = await api.getCourse(id);
    if (response.success && response.data) {
      setCourse(response.data);
    } else {
      setError('コース情報の取得に失敗しました');
    }
    setIsLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
      all_levels: '全レベル'
    };
    return labels[level] || level;
  };

  const getFirstLectureUrl = () => {
    if (!course?.sections?.[0]?.lectures?.[0]) {
      return `/courses/${course?.id}`;
    }
    return `/courses/${course.id}/learn/${course.sections[0].lectures[0].id}`;
  };

  const shareText = course 
    ? `「${course.title}」の受講を開始しました！ #FutureClock #オンライン学習`
    : '';

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">エラー</h1>
            <p className="text-muted-foreground mb-4">{error || 'コースが見つかりません'}</p>
            <Link href="/dashboard/courses">
              <Button>マイコースへ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-3xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <PartyPopper className="h-6 w-6 text-yellow-500" />
              <h1 className="text-3xl font-bold">購入完了！</h1>
              <PartyPopper className="h-6 w-6 text-yellow-500" />
            </div>
            
            <p className="text-lg text-muted-foreground">
              ご購入ありがとうございます。コースにアクセスできるようになりました。
            </p>
          </div>

          {/* Course Card */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-8">
            <div className="aspect-video bg-muted relative">
              {course.thumbnailUrl ? (
                <img 
                  src={course.thumbnailUrl} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                  <BookOpen className="h-16 w-16 text-primary" />
                </div>
              )}
              
              {/* Play overlay */}
              <Link href={getFirstLectureUrl()} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                <div className="rounded-full bg-white p-6 shadow-lg">
                  <Play className="h-12 w-12 text-primary fill-primary" />
                </div>
              </Link>
            </div>
            
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{course.title}</h2>
              <p className="text-muted-foreground mb-4">{course.subtitle}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(course.totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  <span>{course.totalLectures}レッスン</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>{getLevelLabel(course.level)}</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={getFirstLectureUrl()} className="flex-1">
                  <Button className="w-full gap-2" size="lg">
                    <Play className="h-5 w-5" />
                    学習を開始する
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/dashboard/courses">
                  <Button variant="outline" className="w-full sm:w-auto gap-2" size="lg">
                    <BookOpen className="h-5 w-5" />
                    マイコース
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {/* Receipt */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold">領収書</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                領収書はマイページからいつでもダウンロードできます。
              </p>
              <Link href="/dashboard/history">
                <Button variant="outline" size="sm" className="w-full">
                  購入履歴を見る
                </Button>
              </Link>
            </div>

            {/* Email Confirmation */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold">確認メール</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                購入確認メールを{user?.email || 'ご登録のメールアドレス'}にお送りしました。
              </p>
            </div>
          </div>

          {/* Share */}
          <div className="bg-white rounded-xl border p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Share2 className="h-5 w-5" />
              <h3 className="font-semibold">学習開始をシェアしよう！</h3>
            </div>
            
            <div className="flex justify-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4267B2] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold mb-2">次のステップ</h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/dashboard" className="text-primary hover:underline">
                ダッシュボードで進捗を確認
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/courses" className="text-primary hover:underline">
                他のコースを探す
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/settings" className="text-primary hover:underline">
                通知設定を確認
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
