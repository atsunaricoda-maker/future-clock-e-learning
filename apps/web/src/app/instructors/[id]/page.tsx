'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Star,
  Users,
  BookOpen,
  Globe,
  Twitter,
  Linkedin,
  Youtube,
  Play,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface Instructor {
  id: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  expertise?: string[];
  experience?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  totalStudents: number;
  totalCourses: number;
  totalReviews: number;
  averageRating: number;
  isVerified?: boolean;
}

interface Course {
  id: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  price: number;
  currency: string;
  level: string;
  totalDuration: number;
  totalLectures: number;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
}

interface Review {
  id: string;
  courseId: string;
  courseTitle: string;
  rating: number;
  title?: string;
  content?: string;
  userName: string;
  createdAt: string;
}

export default function InstructorProfilePage() {
  const params = useParams();
  const instructorId = params.id as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'about' | 'reviews'>('courses');

  useEffect(() => {
    if (instructorId) {
      fetchInstructorData();
    }
  }, [instructorId]);

  const fetchInstructorData = async () => {
    try {
      // 講師情報を取得（実際のAPIが必要）
      const instructorRes = await api.getInstructorProfile(instructorId);
      if (instructorRes.success && instructorRes.data) {
        setInstructor(instructorRes.data);
      }

      // 講師のコース一覧を取得
      const coursesRes = await api.getInstructorPublicCourses(instructorId);
      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data.courses || []);
      }

      // レビューを取得
      const reviewsRes = await api.getInstructorPublicReviews(instructorId);
      if (reviewsRes.success && reviewsRes.data) {
        setReviews(reviewsRes.data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch instructor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return '無料';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(price);
  };

  const levelLabels: Record<string, string> = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級',
    all_levels: '全レベル',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">講師が見つかりません</h1>
            <p className="text-muted-foreground mb-4">指定された講師は存在しないか、公開されていません。</p>
            <Link href="/instructors">
              <Button>講師一覧に戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative">
              {instructor.avatarUrl ? (
                <img
                  src={instructor.avatarUrl}
                  alt={instructor.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/20 flex items-center justify-center border-4 border-white">
                  <span className="text-4xl font-bold">{instructor.name.charAt(0)}</span>
                </div>
              )}
              {instructor.isVerified && (
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-3xl font-bold">{instructor.name}</h1>
                {instructor.isVerified && (
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">認定講師</span>
                )}
              </div>
              {instructor.headline && (
                <p className="text-lg text-blue-100 mb-4">{instructor.headline}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-200" />
                  <span className="font-semibold">{instructor.totalStudents.toLocaleString()}</span>
                  <span className="text-blue-200">受講生</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-200" />
                  <span className="font-semibold">{instructor.totalCourses}</span>
                  <span className="text-blue-200">コース</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{instructor.averageRating.toFixed(1)}</span>
                  <span className="text-blue-200">({instructor.totalReviews.toLocaleString()}件)</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex justify-center md:justify-start gap-3">
                {instructor.website && (
                  <a href={instructor.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {instructor.socialLinks?.twitter && (
                  <a href={instructor.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {instructor.socialLinks?.linkedin && (
                  <a href={instructor.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {instructor.socialLinks?.youtube && (
                  <a href={instructor.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: 'courses', label: 'コース', count: courses.length },
              { id: 'about', label: 'プロフィール' },
              { id: 'reviews', label: 'レビュー', count: reviews.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">まだコースがありません</p>
              </div>
            ) : (
              courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 relative">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(course.totalDuration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-2">{course.title}</h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{course.averageRating.toFixed(1)}</span>
                        <span>({course.totalReviews}件)</span>
                        <span className="mx-1">•</span>
                        <Users className="h-4 w-4" />
                        <span>{course.totalEnrollments.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {levelLabels[course.level] || course.level}
                        </span>
                        <span className="font-bold text-lg">
                          {formatPrice(course.price, course.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border p-6 space-y-6">
              {/* Bio */}
              {instructor.bio && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">自己紹介</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{instructor.bio}</p>
                </div>
              )}

              {/* Expertise */}
              {instructor.expertise && instructor.expertise.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">専門分野</h3>
                  <div className="flex flex-wrap gap-2">
                    {instructor.expertise.map((skill, index) => (
                      <span key={index} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {instructor.experience && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">経歴</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{instructor.experience}</p>
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{instructor.totalStudents.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">受講生</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{instructor.totalCourses}</p>
                  <p className="text-sm text-muted-foreground">コース</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{instructor.totalReviews.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">レビュー</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{instructor.averageRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">平均評価</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">まだレビューがありません</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link href={`/courses/${review.courseId}`} className="text-sm text-primary hover:underline">
                        {review.courseTitle}
                      </Link>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  {review.title && <h4 className="font-semibold mb-2">{review.title}</h4>}
                  {review.content && <p className="text-muted-foreground">{review.content}</p>}
                  <p className="text-sm text-muted-foreground mt-3">- {review.userName}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
