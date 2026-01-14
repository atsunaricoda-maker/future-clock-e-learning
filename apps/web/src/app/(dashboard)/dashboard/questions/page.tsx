'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MessageCircle, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  status: string;
  courseId: string;
  courseTitle: string;
  answerCount: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: {
    label: '回答待ち',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-4 w-4" />,
  },
  answered: {
    label: '回答あり',
    color: 'bg-blue-100 text-blue-700',
    icon: <MessageCircle className="h-4 w-4" />,
  },
  resolved: {
    label: '解決済み',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

export default function MyQuestionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/sign-in');
      } else {
        loadQuestions();
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const loadQuestions = async () => {
    setIsLoading(true);
    const response = await api.getMyQuestions({ limit: 20 });
    if (response.success && response.data) {
      setQuestions(response.data.questions);
      setPagination(response.data.pagination);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-700',
      icon: <AlertCircle className="h-4 w-4" />,
    };
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                マイ質問
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                あなたが投稿した質問の一覧
              </p>
            </div>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="text-center py-16 bg-background rounded-xl border">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">質問はありません</h2>
              <p className="text-muted-foreground mb-6">
                コースでわからないことがあれば質問してみましょう
              </p>
              <Link href="/dashboard/courses">
                <Button>受講中のコースを見る</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => {
                const statusConfig = getStatusConfig(question.status);
                return (
                  <Link
                    key={question.id}
                    href={`/questions/${question.id}`}
                    className="block bg-background rounded-xl border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                          {question.answerCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {question.answerCount}件の回答
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold line-clamp-2">{question.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{question.courseTitle}</span>
                          <span>{formatDate(question.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                >
                  前へ
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
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
