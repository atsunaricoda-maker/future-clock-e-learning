'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Question {
  id: string;
  title: string;
  content: string;
  status: string;
  courseId: string;
  courseTitle: string;
  userName: string;
  answerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InstructorQuestionsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchQuestions();
    }
  }, [authLoading, isAuthenticated, pagination.page, statusFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.getInstructorQuestions({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (response.success && response.data) {
        setQuestions(response.data.questions);
        setPagination((prev) => ({ ...prev, ...response.data?.pagination }));
      } else {
        setError(response.error?.message || '質問の取得に失敗しました');
      }
    } catch (err) {
      setError('質問の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!answerContent.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.answerQuestion(questionId, answerContent);
      if (response.success) {
        setAnsweringId(null);
        setAnswerContent('');
        fetchQuestions();
      } else {
        setError(response.error?.message || '回答の投稿に失敗しました');
      }
    } catch (err) {
      setError('回答の投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect=/instructor/questions';
    }
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'closed':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'answered':
        return <span className="text-green-600">回答済み</span>;
      case 'closed':
        return <span className="text-gray-500">クローズ</span>;
      default:
        return <span className="text-yellow-600">未回答</span>;
    }
  };

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
            <h1 className="text-2xl font-bold">Q&A対応</h1>
            <p className="text-muted-foreground mt-1">受講者からの質問に回答</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">すべて</option>
            <option value="open">未回答</option>
            <option value="answered">回答済み</option>
            <option value="closed">クローズ</option>
          </select>
        </div>
        <span className="text-sm text-muted-foreground">
          {pagination.total}件の質問
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-muted-foreground">質問がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(question.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{question.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {question.content}
                        </p>
                      </div>
                      {getStatusLabel(question.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{question.userName}</span>
                      <span>・</span>
                      <Link
                        href={`/courses/${question.courseId}`}
                        className="hover:text-primary"
                      >
                        {question.courseTitle}
                      </Link>
                      <span>・</span>
                      <span>{new Date(question.createdAt).toLocaleDateString('ja-JP')}</span>
                      {question.answerCount > 0 && (
                        <>
                          <span>・</span>
                          <span>{question.answerCount}件の回答</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answer Form */}
                {answeringId === question.id ? (
                  <div className="mt-4 pt-4 border-t">
                    <textarea
                      value={answerContent}
                      onChange={(e) => setAnswerContent(e.target.value)}
                      placeholder="回答を入力してください..."
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                      disabled={submitting}
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAnsweringId(null);
                          setAnswerContent('');
                        }}
                        disabled={submitting}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAnswer(question.id)}
                        disabled={submitting || !answerContent.trim()}
                        className="gap-2"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        回答を投稿
                      </Button>
                    </div>
                  </div>
                ) : question.status === 'open' ? (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAnsweringId(question.id)}
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      回答する
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
          >
            次へ
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
