'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Eye, 
  Plus, 
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Video,
  FileText
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  lectures: Lecture[];
}

interface Lecture {
  id: string;
  title: string;
  description?: string;
  contentType: 'video' | 'quiz' | 'document';
  duration: number;
  isFree: boolean;
  isPublished: boolean;
}

interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  level: string;
  price: number;
  currency: string;
  status: string;
  sections: Section[];
}

export default function EditCoursePage() {
  const params = useParams();
  useAuth(); // Ensure user is authenticated
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    categoryId: '',
    level: 'beginner',
    price: 0,
  });

  const [newSectionTitle, setNewSectionTitle] = useState('');

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
      setFormData({
        title: response.data.title || '',
        subtitle: response.data.subtitle || '',
        description: response.data.description || '',
        categoryId: response.data.category?.id || '',
        level: response.data.level || 'beginner',
        price: response.data.price || 0,
      });
      // Expand all sections by default
      if (response.data.sections?.length > 0) {
        setExpandedSections(new Set(response.data.sections.map((s: Section) => s.id)));
      }
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      const response = await api.updateCourse(params.id as string, formData);
      if (response.success) {
        // Reload course data
        await loadCourse(params.id as string);
      } else {
        setError(response.error?.message || '保存に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    
    try {
      const response = await api.createSection(params.id as string, { 
        title: newSectionTitle 
      });
      if (response.success) {
        setNewSectionTitle('');
        await loadCourse(params.id as string);
      }
    } catch (err) {
      setError('セクションの追加に失敗しました');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('このセクションを削除しますか？含まれるレッスンもすべて削除されます。')) {
      return;
    }
    
    try {
      const response = await api.deleteSection(params.id as string, sectionId);
      if (response.success) {
        await loadCourse(params.id as string);
      }
    } catch (err) {
      setError('セクションの削除に失敗しました');
    }
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
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">コースが見つかりません</p>
        <Link href="/instructor/courses" className="text-primary hover:underline mt-4 inline-block">
          コース一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold line-clamp-1">{course.title}</h1>
            <p className="text-muted-foreground mt-1">コースを編集</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/courses/${course.id}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              プレビュー
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { id: 'basic', label: '基本情報' },
            { id: 'curriculum', label: 'カリキュラム' },
            { id: 'pricing', label: '価格設定' },
            { id: 'settings', label: '設定' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">基本情報</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">コースタイトル</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">サブタイトル</label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">コース説明</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">カテゴリ</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">カテゴリを選択</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">難易度</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  {levels.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">カリキュラム</h2>
            </div>

            {/* Add Section */}
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="新しいセクション名"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              />
              <Button onClick={handleAddSection} className="gap-2">
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {course.sections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  セクションがありません。上のフォームから追加してください。
                </div>
              ) : (
                course.sections?.map((section, index) => (
                  <div key={section.id} className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {expandedSections.has(section.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <div>
                          <span className="font-medium">セクション {index + 1}: {section.title}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({section.lectures?.length || 0}レッスン)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Edit section
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(section.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expandedSections.has(section.id) && (
                      <div className="border-t bg-muted/30 p-4 space-y-2">
                        {section.lectures?.map((lecture) => (
                          <div
                            key={lecture.id}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDuration(lecture.duration || 0)}</span>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button variant="outline" size="sm" className="w-full gap-2 mt-2">
                          <Plus className="h-4 w-4" />
                          レッスンを追加
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">価格設定</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">価格（円）</label>
              <Input
                type="number"
                min="0"
                step="100"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                0円の場合は無料コースになります
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">コース設定</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">公開ステータス</p>
                  <p className="text-sm text-muted-foreground">
                    現在のステータス: {course.status === 'published' ? '公開中' : '下書き'}
                  </p>
                </div>
                <Button variant={course.status === 'published' ? 'outline' : 'default'}>
                  {course.status === 'published' ? '非公開にする' : '公開申請する'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50">
                <div>
                  <p className="font-medium text-destructive">コースを削除</p>
                  <p className="text-sm text-muted-foreground">
                    この操作は取り消せません
                  </p>
                </div>
                <Button variant="destructive">
                  削除
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
