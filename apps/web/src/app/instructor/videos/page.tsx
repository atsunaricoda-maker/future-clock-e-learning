'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Video,
  Upload,
  Search,
  MoreVertical,
  Play,
  Trash2,
  Link2,
  Clock,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileVideo,
  Settings,
} from 'lucide-react';

interface VideoItem {
  id: string;
  title: string;
  duration: number;
  status: 'processing' | 'ready' | 'error';
  thumbnailUrl?: string;
  size?: number;
  createdAt: string;
  linkedLecture?: {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
  };
}

export default function InstructorVideosPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in?redirect=/instructor/videos');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVideos();
    }
  }, [isAuthenticated]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.getInstructorVideos();
      if (response.success && response.data) {
        setVideos(response.data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Get upload URL from API
      const uploadUrlResponse = await api.getVideoUploadUrl();
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('アップロードURLの取得に失敗しました');
      }

      // Simulate upload progress (in real implementation, use TUS protocol)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadProgress(i);
      }

      // Close modal and refresh
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadTitle('');
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('この動画を削除しますか？関連するレッスンからも削除されます。')) return;

    try {
      const response = await api.deleteVideo(videoId);
      if (response.success) {
        await fetchVideos();
      }
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            準備完了
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            処理中
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3" />
            エラー
          </span>
        );
      default:
        return null;
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">動画管理</h1>
          <p className="text-muted-foreground mt-1">
            アップロードした動画を管理します
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            動画をアップロード
          </Button>
        </label>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="動画を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="h-4 w-4" />
          <span>{videos.length} 件の動画</span>
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <FileVideo className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? '検索結果がありません' : 'まだ動画がありません'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? '別のキーワードで検索してください' 
              : '最初の動画をアップロードしましょう'}
          </p>
          {!searchQuery && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                動画をアップロード
              </Button>
            </label>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div 
              key={video.id} 
              className="rounded-xl border bg-card overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Video className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Play className="h-6 w-6" />
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                  {formatDuration(video.duration)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(video.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(video.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedVideo(selectedVideo === video.id ? null : video.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {selectedVideo === video.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-white border rounded-lg shadow-lg py-1 min-w-[140px]">
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {/* Play video preview */}}
                        >
                          <Play className="h-4 w-4" />
                          プレビュー
                        </button>
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {/* Link to lecture */}}
                        >
                          <Link2 className="h-4 w-4" />
                          レッスンに紐付け
                        </button>
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {/* Edit settings */}}
                        >
                          <Settings className="h-4 w-4" />
                          設定
                        </button>
                        <hr className="my-1" />
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                          onClick={() => handleDeleteVideo(video.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {getStatusBadge(video.status)}
                  {video.linkedLecture ? (
                    <Link 
                      href={`/instructor/courses/${video.linkedLecture.courseId}`}
                      className="text-xs text-primary hover:underline truncate max-w-[150px]"
                    >
                      {video.linkedLecture.courseTitle}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">未紐付け</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isUploading && setShowUploadModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">動画をアップロード</h3>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={() => setShowUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {selectedFile && (
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <FileVideo className="h-8 w-8 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">動画タイトル</label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="動画のタイトルを入力"
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>アップロード中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {!isUploading && (
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                  キャンセル
                </Button>
              )}
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || !uploadTitle.trim()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    アップロード
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
