'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  BookOpen,
  Bookmark,
  Edit3,
  Trash2,
  Plus,
  Save,
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

interface Note {
  id: string;
  content: string;
  timestampSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BookmarkItem {
  id: string;
  title: string | null;
  timestampSeconds: number;
  createdAt: string;
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
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
  
  // Notes & Bookmarks state
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showNotesPanel, setShowNotesPanel] = useState(false);

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
      fetchNotesAndBookmarks();
    }
  }, [course, lectureId]);

  const fetchCourseData = async () => {
    try {
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

      const progressResponse = await api.getCourseProgress(courseId);
      if (progressResponse.success) {
        setIsEnrolled(true);
      }

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

  const fetchNotesAndBookmarks = async () => {
    try {
      const [notesRes, bookmarksRes] = await Promise.all([
        api.getNotes({ lectureId }),
        api.getBookmarks({ lectureId }),
      ]);

      if (notesRes.success && notesRes.data) {
        setNotes(notesRes.data.notes || []);
      }
      if (bookmarksRes.success && bookmarksRes.data) {
        setBookmarks(bookmarksRes.data.bookmarks || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes/bookmarks:', err);
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
    setCurrentVideoTime(currentTime);
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

  // Notes handlers
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await api.createNote({
        lectureId,
        content: newNoteContent,
        timestampSeconds: Math.floor(currentVideoTime),
      });

      if (response.success && response.data) {
        const newNote: Note = {
          id: response.data.id,
          content: response.data.content,
          timestampSeconds: response.data.timestampSeconds,
          createdAt: response.data.createdAt,
          updatedAt: response.data.createdAt,
        };
        setNotes(prev => [newNote, ...prev]);
        setNewNoteContent('');
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) return;

    try {
      const response = await api.updateNote(noteId, { content: editingContent });
      if (response.success) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: editingContent, updatedAt: new Date().toISOString() } : n));
        setEditingNoteId(null);
        setEditingContent('');
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('このノートを削除しますか？')) return;

    try {
      const response = await api.deleteNote(noteId);
      if (response.success) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Bookmarks handlers
  const handleAddBookmark = async () => {
    const timestamp = Math.floor(currentVideoTime);
    const title = prompt('ブックマークの名前（任意）：');

    try {
      const response = await api.createBookmark({
        lectureId,
        timestampSeconds: timestamp,
        title: title || undefined,
      });

      if (response.success && response.data) {
        setBookmarks(prev => [...prev, response.data!].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      }
    } catch (err) {
      console.error('Failed to create bookmark:', err);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      const response = await api.deleteBookmark(bookmarkId);
      if (response.success) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const seekToTime = (seconds: number) => {
    // VideoPlayerコンポーネントにseek機能を追加する場合用
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
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
    const secs = Math.floor(seconds % 60);
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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                ノート・ブックマーク
              </Button>
              {!currentLecture?.isCompleted && (
                <Button onClick={handleCompleteLecture}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  完了としてマーク
                </Button>
              )}
            </div>
          </div>

          {/* Notes & Bookmarks Panel */}
          {showNotesPanel && (
            <div className="mb-6 bg-gray-800 rounded-xl p-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-gray-700 pb-3 mb-4">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="h-4 w-4" />
                  ノート ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'bookmarks' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  ブックマーク ({bookmarks.length})
                </button>
              </div>

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Add Note */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="ノートを追加... (現在の再生位置に紐付けられます)"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleAddNote} disabled={!newNoteContent.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        まだノートがありません
                      </p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="bg-gray-700 rounded-lg p-3">
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm resize-none"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>
                                  キャンセル
                                </Button>
                                <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                                  <Save className="h-3 w-3 mr-1" />
                                  保存
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {note.timestampSeconds !== null && (
                                    <button
                                      onClick={() => seekToTime(note.timestampSeconds!)}
                                      className="text-blue-400 hover:text-blue-300 text-xs mb-1"
                                    >
                                      {formatDuration(note.timestampSeconds)}
                                    </button>
                                  )}
                                  <p className="text-gray-200 text-sm whitespace-pre-wrap">{note.content}</p>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(note.id);
                                      setEditingContent(note.content);
                                    }}
                                    className="text-gray-400 hover:text-white p-1"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-gray-400 hover:text-red-400 p-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Bookmarks Tab */}
              {activeTab === 'bookmarks' && (
                <div className="space-y-4">
                  {/* Add Bookmark */}
                  <Button onClick={handleAddBookmark} className="gap-2">
                    <Bookmark className="h-4 w-4" />
                    現在の位置にブックマークを追加 ({formatDuration(currentVideoTime)})
                  </Button>

                  {/* Bookmarks List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bookmarks.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        まだブックマークがありません
                      </p>
                    ) : (
                      bookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                        >
                          <button
                            onClick={() => seekToTime(bookmark.timestampSeconds)}
                            className="flex items-center gap-3 text-left hover:text-blue-400"
                          >
                            <span className="text-blue-400 font-mono text-sm">
                              {formatDuration(bookmark.timestampSeconds)}
                            </span>
                            <span className="text-gray-200 text-sm">
                              {bookmark.title || 'ブックマーク'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteBookmark(bookmark.id)}
                            className="text-gray-400 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
