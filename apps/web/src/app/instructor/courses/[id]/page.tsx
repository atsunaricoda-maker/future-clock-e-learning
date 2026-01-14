'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
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
  FileText,
  Upload,
  X,
  Check,
  Clock,
  AlertCircle,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw
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
  videoStatus?: string;
  videoId?: string;
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
  rejectionReason?: string;
  totalLectures?: number;
  sections: Section[];
}

// Course Status Section Component
function CourseStatusSection({ 
  course, 
  onSubmitForReview 
}: { 
  course: Course; 
  onSubmitForReview: () => void;
}) {
  const getStatusInfo = () => {
    switch (course.status) {
      case 'draft':
        return {
          color: 'bg-gray-100 border-gray-200',
          textColor: 'text-gray-700',
          icon: <Edit className="h-5 w-5" />,
          label: '下書き',
          description: 'このコースはまだ公開されていません。',
        };
      case 'pending_review':
        return {
          color: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-700',
          icon: <Clock className="h-5 w-5" />,
          label: '審査中',
          description: '管理者が内容を確認しています。通常1-3営業日かかります。',
        };
      case 'published':
        return {
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-700',
          icon: <CheckCircle className="h-5 w-5" />,
          label: '公開中',
          description: 'このコースは受講者に公開されています。',
        };
      case 'rejected':
        return {
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-700',
          icon: <XCircle className="h-5 w-5" />,
          label: '審査却下',
          description: '審査が却下されました。内容を修正して再申請してください。',
        };
      default:
        return {
          color: 'bg-gray-100 border-gray-200',
          textColor: 'text-gray-700',
          icon: <AlertCircle className="h-5 w-5" />,
          label: '不明',
          description: '',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const canSubmitForReview = course.status === 'draft' || course.status === 'rejected';
  const hasMinimumContent = (course.totalLectures || 0) >= 1;

  return (
    <div className={`p-4 border rounded-lg ${statusInfo.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={statusInfo.textColor}>
            {statusInfo.icon}
          </div>
          <div>
            <p className={`font-medium ${statusInfo.textColor}`}>
              ステータス: {statusInfo.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusInfo.description}
            </p>
            
            {/* 却下理由の表示 */}
            {course.status === 'rejected' && course.rejectionReason && (
              <div className="mt-3 p-3 bg-red-100 rounded-lg">
                <p className="text-sm font-medium text-red-800">却下理由:</p>
                <p className="text-sm text-red-700 mt-1">{course.rejectionReason}</p>
              </div>
            )}

            {/* 審査申請の要件チェック */}
            {canSubmitForReview && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">審査申請の要件:</p>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-sm ${hasMinimumContent ? 'text-green-600' : 'text-red-600'}`}>
                    {hasMinimumContent ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    1つ以上のレッスンがある
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${course.price >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <Check className="h-4 w-4" />
                    価格が設定されている
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div>
          {canSubmitForReview && (
            <Button 
              onClick={onSubmitForReview}
              disabled={!hasMinimumContent}
              className="gap-2"
            >
              {course.status === 'rejected' ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  再申請する
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  審査に提出
                </>
              )}
            </Button>
          )}
          
          {course.status === 'pending_review' && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">審査待ち</span>
            </div>
          )}
          
          {course.status === 'published' && (
            <Button variant="outline">
              非公開にする
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditCoursePage() {
  const params = useParams();
  useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
  
  // Lecture modal state
  const [lectureModal, setLectureModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    sectionId: string;
    lectureId?: string;
    data: {
      title: string;
      description: string;
      contentType: 'video' | 'document';
      isFree: boolean;
    };
  } | null>(null);

  // Video upload state
  const [videoUpload, setVideoUpload] = useState<{
    lectureId: string;
    sectionId: string;
    isUploading: boolean;
    progress: number;
    error?: string;
  } | null>(null);

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

  const loadCourse = useCallback(async (id: string) => {
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
      if (response.data.sections?.length > 0) {
        setExpandedSections(new Set(response.data.sections.map((s: Section) => s.id)));
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (params.id) {
      loadCourse(params.id as string);
    }
  }, [params.id, loadCourse]);

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      const response = await api.updateCourse(params.id as string, formData);
      if (response.success) {
        setSuccessMessage('保存しました');
        setTimeout(() => setSuccessMessage(''), 3000);
        await loadCourse(params.id as string);
      } else {
        setError(response.error?.message || '保存に失敗しました');
      }
    } catch {
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
    } catch {
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
    } catch {
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

  // Lecture CRUD
  const openAddLectureModal = (sectionId: string) => {
    setLectureModal({
      isOpen: true,
      mode: 'add',
      sectionId,
      data: {
        title: '',
        description: '',
        contentType: 'video',
        isFree: false,
      },
    });
  };

  const openEditLectureModal = (sectionId: string, lecture: Lecture) => {
    setLectureModal({
      isOpen: true,
      mode: 'edit',
      sectionId,
      lectureId: lecture.id,
      data: {
        title: lecture.title,
        description: lecture.description || '',
        contentType: lecture.contentType === 'video' ? 'video' : 'document',
        isFree: lecture.isFree,
      },
    });
  };

  const handleSaveLecture = async () => {
    if (!lectureModal || !lectureModal.data.title.trim()) return;

    try {
      if (lectureModal.mode === 'add') {
        const response = await api.createLecture(
          params.id as string,
          lectureModal.sectionId,
          lectureModal.data
        );
        if (response.success) {
          setLectureModal(null);
          await loadCourse(params.id as string);
        } else {
          setError(response.error?.message || 'レッスンの追加に失敗しました');
        }
      } else {
        const response = await api.updateLecture(
          params.id as string,
          lectureModal.sectionId,
          lectureModal.lectureId!,
          lectureModal.data
        );
        if (response.success) {
          setLectureModal(null);
          await loadCourse(params.id as string);
        } else {
          setError(response.error?.message || 'レッスンの更新に失敗しました');
        }
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    }
  };

  const handleDeleteLecture = async (sectionId: string, lectureId: string) => {
    if (!confirm('このレッスンを削除しますか？')) return;

    try {
      const response = await api.deleteLecture(params.id as string, sectionId, lectureId);
      if (response.success) {
        await loadCourse(params.id as string);
      } else {
        setError(response.error?.message || 'レッスンの削除に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    }
  };

  // Video Upload
  const handleVideoUpload = async (sectionId: string, lectureId: string, _file: File) => {
    setVideoUpload({
      lectureId,
      sectionId,
      isUploading: true,
      progress: 0,
    });

    try {
      // Get upload URL from API
      const uploadUrlResponse = await api.getVideoUploadUrl();
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('アップロードURLの取得に失敗しました');
      }

      const { uploadId } = uploadUrlResponse.data;

      // Upload video using TUS protocol (simplified for demo)
      // In production, use tus-js-client library with uploadUrl and _file
      setVideoUpload(prev => prev ? { ...prev, progress: 10 } : null);

      // Simulating upload progress (in real implementation, upload to Cloudflare Stream)
      for (let i = 20; i <= 80; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setVideoUpload(prev => prev ? { ...prev, progress: i } : null);
      }

      // Link the video to the lecture
      const linkResponse = await api.linkVideoToLecture({
        courseId: params.id as string,
        sectionId,
        lectureId,
        streamVideoId: uploadId,
        duration: 600, // Mock duration
      });

      if (linkResponse.success) {
        setVideoUpload(prev => prev ? { ...prev, progress: 100 } : null);
        await loadCourse(params.id as string);
        setTimeout(() => setVideoUpload(null), 1000);
        setSuccessMessage('動画をアップロードしました');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(linkResponse.error?.message || '動画の紐付けに失敗しました');
      }
    } catch (err) {
      setVideoUpload(prev => prev ? { 
        ...prev, 
        isUploading: false, 
        error: err instanceof Error ? err.message : '動画のアップロードに失敗しました'
      } : null);
    }
  };

  const getVideoStatusBadge = (lecture: Lecture) => {
    if (!lecture.videoId && lecture.contentType === 'video') {
      return (
        <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
          <AlertCircle className="h-3 w-3" />
          動画未設定
        </span>
      );
    }
    if (lecture.videoStatus === 'processing') {
      return (
        <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          処理中
        </span>
      );
    }
    if (lecture.videoStatus === 'ready') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
          <Check className="h-3 w-3" />
          準備完了
        </span>
      );
    }
    return null;
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

      {successMessage && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-700">
          {successMessage}
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
              <div>
                <h2 className="text-lg font-semibold">カリキュラム</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  セクションとレッスンを追加して、コースの内容を構成します
                </p>
              </div>
            </div>

            {/* Add Section */}
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="新しいセクション名（例：はじめに）"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              />
              <Button onClick={handleAddSection} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                セクション追加
              </Button>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {course.sections?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">セクションがありません</p>
                  <p className="text-sm text-muted-foreground">
                    上のフォームからセクションを追加して、コースの構成を始めましょう
                  </p>
                </div>
              ) : (
                course.sections?.map((section, index) => (
                  <div key={section.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50"
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
                            handleDeleteSection(section.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expandedSections.has(section.id) && (
                      <div className="p-4 space-y-3">
                        {section.lectures?.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            このセクションにはまだレッスンがありません
                          </div>
                        ) : (
                          section.lectures?.map((lecture) => (
                            <div
                              key={lecture.id}
                              className="flex items-center justify-between p-3 bg-background rounded-lg border"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                                {lecture.contentType === 'video' ? (
                                  <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">{lecture.title}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {lecture.isFree && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        無料プレビュー
                                      </span>
                                    )}
                                    {getVideoStatusBadge(lecture)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {lecture.duration > 0 && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(lecture.duration)}
                                  </span>
                                )}
                                
                                {/* Video Upload Button */}
                                {lecture.contentType === 'video' && (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleVideoUpload(section.id, lecture.id, file);
                                        }
                                      }}
                                      disabled={videoUpload?.lectureId === lecture.id}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      asChild
                                    >
                                      <span>
                                        {videoUpload?.lectureId === lecture.id ? (
                                          <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {videoUpload.progress}%
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-3 w-3" />
                                            動画
                                          </>
                                        )}
                                      </span>
                                    </Button>
                                  </label>
                                )}
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditLectureModal(section.id, lecture)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteLecture(section.id, lecture.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full gap-2"
                          onClick={() => openAddLectureModal(section.id)}
                        >
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
              {/* 公開ステータス表示 */}
              <CourseStatusSection 
                course={course} 
                onSubmitForReview={async () => {
                  if (!confirm('このコースを審査に提出しますか？')) return;
                  
                  try {
                    const response = await api.submitCourseForReview(params.id as string);
                    if (response.success) {
                      setSuccessMessage('審査に提出しました。審査には通常1-3営業日かかります。');
                      setTimeout(() => setSuccessMessage(''), 5000);
                      await loadCourse(params.id as string);
                    } else {
                      setError(response.error?.message || '審査申請に失敗しました');
                    }
                  } catch {
                    setError('ネットワークエラーが発生しました');
                  }
                }}
              />

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

      {/* Lecture Modal */}
      {lectureModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setLectureModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {lectureModal.mode === 'add' ? 'レッスンを追加' : 'レッスンを編集'}
              </h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLectureModal(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">レッスンタイトル <span className="text-destructive">*</span></label>
                <Input
                  value={lectureModal.data.title}
                  onChange={(e) => setLectureModal({
                    ...lectureModal,
                    data: { ...lectureModal.data, title: e.target.value }
                  })}
                  placeholder="例：イントロダクション"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">説明</label>
                <textarea
                  value={lectureModal.data.description}
                  onChange={(e) => setLectureModal({
                    ...lectureModal,
                    data: { ...lectureModal.data, description: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                  placeholder="このレッスンで学ぶ内容を説明してください"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">コンテンツタイプ</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contentType"
                      value="video"
                      checked={lectureModal.data.contentType === 'video'}
                      onChange={() => setLectureModal({
                        ...lectureModal,
                        data: { ...lectureModal.data, contentType: 'video' }
                      })}
                      className="h-4 w-4"
                    />
                    <Video className="h-4 w-4" />
                    <span className="text-sm">動画</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contentType"
                      value="document"
                      checked={lectureModal.data.contentType === 'document'}
                      onChange={() => setLectureModal({
                        ...lectureModal,
                        data: { ...lectureModal.data, contentType: 'document' }
                      })}
                      className="h-4 w-4"
                    />
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">テキスト</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={lectureModal.data.isFree}
                  onChange={(e) => setLectureModal({
                    ...lectureModal,
                    data: { ...lectureModal.data, isFree: e.target.checked }
                  })}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="isFree" className="text-sm">
                  無料プレビューとして公開（購入前に視聴可能）
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setLectureModal(null)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveLecture} disabled={!lectureModal.data.title.trim()}>
                {lectureModal.mode === 'add' ? '追加' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Upload Error */}
      {videoUpload?.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{videoUpload.error}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setVideoUpload(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
