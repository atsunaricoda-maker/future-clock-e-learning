'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  useAuth(); // Ensure user is authenticated
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    categoryId: '',
    level: 'beginner',
    language: 'ja',
    price: 0,
  });

  const categories = [
    { id: 'cat-programming', name: 'プログラミング' },
    { id: 'cat-business', name: 'ビジネス' },
    { id: 'cat-design', name: 'デザイン' },
    { id: 'cat-data', name: 'データサイエンス' },
    { id: 'cat-language', name: '語学' },
  ];

  const levels = [
    { value: 'beginner', label: '初級' },
    { value: 'intermediate', label: '中級' },
    { value: 'advanced', label: '上級' },
    { value: 'all_levels', label: '全レベル' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.createCourse(formData);
      if (response.success && response.data) {
        router.push(`/instructor/courses/${response.data.id}`);
      } else {
        setError(response.error?.message || 'コースの作成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/instructor/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新規コース作成</h1>
          <p className="text-muted-foreground mt-1">
            コースの基本情報を入力してください
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">基本情報</h2>
          
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              コースタイトル <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              placeholder="例: Pythonで学ぶ機械学習入門"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              魅力的で分かりやすいタイトルをつけましょう
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="subtitle" className="text-sm font-medium">
              サブタイトル
            </label>
            <Input
              id="subtitle"
              placeholder="例: 初心者でも分かる実践的なAI開発"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              コース説明
            </label>
            <textarea
              id="description"
              placeholder="コースの内容、学べること、対象者などを詳しく説明してください"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              rows={5}
              className="w-full px-3 py-2 border rounded-md text-sm resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">カテゴリと難易度</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                カテゴリ
              </label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">カテゴリを選択</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="level" className="text-sm font-medium">
                難易度
              </label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">価格設定</h2>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              価格（円）
            </label>
            <Input
              id="price"
              type="number"
              min="0"
              step="100"
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              0円の場合は無料コースになります
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/instructor/courses">
            <Button type="button" variant="outline" disabled={isLoading}>
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              'コースを作成'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
