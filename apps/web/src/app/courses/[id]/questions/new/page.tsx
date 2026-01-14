'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ArrowLeft, Send, HelpCircle } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  sections: Array<{
    id: string;
    title: string;
    lectures: Array<{
      id: string;
      title: string;
    }>;
  }>;
}

export default function NewQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lectureId, setLectureId] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/sign-in');
      } else if (params.id) {
        loadCourse(params.id as string);
      }
    }
  }, [isAuthenticated, authLoading, params.id, router]);

  const loadCourse = async (courseId: string) => {
    setIsLoading(true);
    const response = await api.getCourse(courseId);
    if (response.success && response.data) {
      setCourse(response.data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('タイトルと質問内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    const response = await api.createQuestion({
      courseId: params.id as string,
      lectureId: lectureId || undefined,
      title: title.trim(),
      content: content.trim(),
    });

    if (response.success) {
      router.push(`/courses/${params.id}?tab=qa`);
    } else {
      alert(response.error?.message || '質問の投稿に失敗しました');
    }
    setIsSubmitting(false);
  };

  if (authLoading || isLoading) {
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          {/* Back Link */}
          <Link
            href={`/courses/${params.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {course.title}に戻る
          </Link>

          {/* Header */}
          <div className="bg-background rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">質問を投稿</h1>
                <p className="text-sm text-muted-foreground">
                  コースについてわからないことを質問しましょう
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h3 className="font-medium mb-2">質問のコツ</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>・具体的で明確なタイトルをつけましょう</li>
                <li>・何を試して、何がうまくいかないか説明しましょう</li>
                <li>・関連するレッスンを選択すると講師が回答しやすくなります</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-background rounded-xl border p-6 space-y-6">
            {/* Lecture Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                関連するレッスン（任意）
              </label>
              <select
                value={lectureId}
                onChange={(e) => setLectureId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">コース全体についての質問</option>
                {course.sections.map((section) => (
                  <optgroup key={section.id} label={section.title}>
                    {section.lectures.map((lecture) => (
                      <option key={lecture.id} value={lecture.id}>
                        {lecture.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                質問タイトル <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 変数の宣言方法について教えてください"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/200文字
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">
                質問内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="質問の詳細を入力してください。できるだけ具体的に、何を試したか、どこで困っているかを説明すると回答を得やすくなります。"
                className="w-full min-h-[200px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/5000文字
              </p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Link href={`/courses/${params.id}`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    投稿中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    質問を投稿
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
