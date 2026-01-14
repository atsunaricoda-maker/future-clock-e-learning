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
import { 
  Play, 
  Clock, 
  Star, 
  Award, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText,
  Video,
  Heart,
  ThumbsUp,
  MessageCircle,
  User
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatarUrl?: string;
    headline?: string;
  };
  category: {
    id: string;
    name: string;
  };
  level: string;
  price: number;
  currency: string;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  totalDuration: number;
  totalLectures: number;
  thumbnailUrl?: string;
  sections?: Section[];
  whatYouWillLearn?: string[];
  requirements?: string[];
}

interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Lecture {
  id: string;
  title: string;
  contentType: 'video' | 'quiz' | 'document';
  duration?: number;
  isFree: boolean;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  helpfulCount?: number;
  isVerifiedPurchase?: boolean;
  userName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Wishlist
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [reviewSortBy, setReviewSortBy] = useState('newest');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' });
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  
  // Q&A
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'qa'>('overview');

  useEffect(() => {
    if (params.id) {
      loadCourse(params.id as string);
      loadReviews(params.id as string);
      if (isAuthenticated) {
        checkWishlist(params.id as string);
        loadMyReview(params.id as string);
      }
    }
  }, [params.id, isAuthenticated]);

  const loadCourse = async (id: string) => {
    setIsLoading(true);
    const response = await api.getCourse(id);
    if (response.success && response.data) {
      setCourse(response.data);
      if (response.data.sections?.length > 0) {
        setExpandedSections(new Set([response.data.sections[0].id]));
      }
    }
    setIsLoading(false);
  };

  const loadReviews = async (courseId: string) => {
    setReviewsLoading(true);
    const response = await api.getCourseReviews(courseId, { sortBy: reviewSortBy, limit: 10 });
    if (response.success && response.data) {
      setReviews(response.data.reviews);
      setRatingDistribution(response.data.ratingDistribution);
    }
    setReviewsLoading(false);
  };

  const loadMyReview = async (courseId: string) => {
    const response = await api.getMyReview(courseId);
    if (response.success && response.data) {
      setMyReview(response.data as Review);
      setReviewForm({
        rating: (response.data as Review).rating,
        title: (response.data as Review).title || '',
        content: (response.data as Review).content || '',
      });
    }
  };

  const checkWishlist = async (courseId: string) => {
    const response = await api.checkWishlist(courseId);
    if (response.success && response.data) {
      setIsInWishlist(response.data.isInWishlist);
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    setWishlistLoading(true);
    if (isInWishlist) {
      const response = await api.removeFromWishlist(params.id as string);
      if (response.success) {
        setIsInWishlist(false);
      }
    } else {
      const response = await api.addToWishlist(params.id as string);
      if (response.success) {
        setIsInWishlist(true);
      }
    }
    setWishlistLoading(false);
  };

  const submitReview = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    setSubmitReviewLoading(true);
    if (myReview) {
      const response = await api.updateReview(myReview.id, reviewForm);
      if (response.success) {
        loadReviews(params.id as string);
        loadMyReview(params.id as string);
        setShowReviewForm(false);
      }
    } else {
      const response = await api.createReview(params.id as string, reviewForm);
      if (response.success) {
        loadReviews(params.id as string);
        loadMyReview(params.id as string);
        setShowReviewForm(false);
      }
    }
    setSubmitReviewLoading(false);
  };

  const markHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    await api.markReviewHelpful(reviewId);
    loadReviews(params.id as string);
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
      all_levels: '全レベル',
    };
    return labels[level] || level;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEnroll = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    alert('購入機能は実装予定です');
  };

  const totalReviews = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);

  if (isLoading) {
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

  const sections: Section[] = course.sections || [];
  const whatYouWillLearn = course.whatYouWillLearn || [
    'プログラミングの基礎概念を理解できる',
    '実践的なコードを書けるようになる',
    '問題解決能力が身につく',
    '実務で使えるスキルが習得できる',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="text-sm text-slate-300 mb-2">
                  <Link href="/courses" className="hover:text-white">コース</Link>
                  {' > '}
                  <Link href={`/courses?category=${course.category.id}`} className="hover:text-white">
                    {course.category.name}
                  </Link>
                </div>
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <p className="text-xl text-slate-300 mt-2">{course.subtitle}</p>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(course.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-slate-300">({course.totalReviews} レビュー)</span>
                  </div>
                  <span className="text-slate-300">
                    {course.totalEnrollments.toLocaleString()}人が受講中
                  </span>
                </div>

                <p className="mt-4">
                  講師: <Link href={`/instructors/${course.instructor.id}`} className="text-primary hover:underline">{course.instructor.name}</Link>
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.totalDuration)}
                  </span>
                  <span>{course.totalLectures}レッスン</span>
                  <span>{getLevelLabel(course.level)}</span>
                </div>
              </div>

              {/* Price Card - Desktop */}
              <div className="hidden lg:block">
                <div className="bg-white text-foreground rounded-xl shadow-lg overflow-hidden sticky top-24">
                  <div className="aspect-video bg-muted relative">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <button className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-colors">
                      <div className="rounded-full bg-white p-4">
                        <Play className="h-8 w-8 text-primary fill-primary" />
                      </div>
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="text-3xl font-bold">
                      {formatPrice(course.price, course.currency)}
                    </div>
                    <Button className="w-full mt-4" size="lg" onClick={handleEnroll}>
                      このコースを購入する
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2" 
                      onClick={toggleWishlist}
                      disabled={wishlistLoading}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                      {isInWishlist ? 'ウィッシュリストから削除' : 'ウィッシュリストに追加'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      30日間返金保証
                    </p>
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(course.totalDuration)}の動画コンテンツ
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {course.totalLectures}レッスン
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        修了証発行
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Price Bar */}
        <div className="lg:hidden sticky top-16 z-40 bg-background border-b p-4">
          <div className="container flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatPrice(course.price, course.currency)}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={toggleWishlist} disabled={wishlistLoading}>
                <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button onClick={handleEnroll}>購入する</Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b sticky top-16 lg:top-0 z-30 bg-background">
          <div className="container">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'
                }`}
              >
                概要
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'
                }`}
              >
                レビュー ({course.totalReviews})
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === 'qa' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'
                }`}
              >
                Q&A
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="py-12">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                
                {activeTab === 'overview' && (
                  <>
                    {/* What you'll learn */}
                    <div className="rounded-xl border p-6">
                      <h2 className="text-xl font-bold mb-4">このコースで学べること</h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {whatYouWillLearn.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Course Content */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">コース内容</h2>
                      <div className="text-sm text-muted-foreground mb-4">
                        {sections.length}セクション・{course.totalLectures}レッスン・{formatDuration(course.totalDuration)}
                      </div>
                      <div className="border rounded-xl overflow-hidden">
                        {sections.map((section, index) => (
                          <div key={section.id} className={index > 0 ? 'border-t' : ''}>
                            <button
                              onClick={() => toggleSection(section.id)}
                              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-left">
                                {expandedSections.has(section.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span className="font-medium">{section.title}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {section.lectures.length}レッスン
                              </span>
                            </button>
                            {expandedSections.has(section.id) && (
                              <div className="border-t bg-muted/30">
                                {section.lectures.map((lecture) => (
                                  <div
                                    key={lecture.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
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
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      {lecture.duration && formatDuration(lecture.duration)}
                                      {!lecture.isFree && <Lock className="h-4 w-4" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">コース説明</h2>
                      <div className="prose prose-sm max-w-none">
                        <p>{course.description || course.subtitle}</p>
                      </div>
                    </div>

                    {/* Instructor */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">講師</h2>
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                          {course.instructor.avatarUrl ? (
                            <img
                              src={course.instructor.avatarUrl}
                              alt={course.instructor.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-muted-foreground">
                              {course.instructor.name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/instructors/${course.instructor.id}`}
                            className="text-lg font-semibold text-primary hover:underline"
                          >
                            {course.instructor.name}
                          </Link>
                          {course.instructor.headline && (
                            <p className="text-muted-foreground">{course.instructor.headline}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-8">
                    {/* Rating Summary */}
                    <div className="rounded-xl border p-6">
                      <h2 className="text-xl font-bold mb-4">受講者のレビュー</h2>
                      <div className="flex items-start gap-8">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-primary">
                            {course.averageRating.toFixed(1)}
                          </div>
                          <div className="flex justify-center mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= Math.round(course.averageRating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {course.totalReviews}件のレビュー
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <div key={rating} className="flex items-center gap-2">
                              <div className="flex items-center gap-1 w-20">
                                {[...Array(rating)].map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full"
                                  style={{
                                    width: `${totalReviews > 0 ? (ratingDistribution[rating] / totalReviews) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12">
                                {ratingDistribution[rating]}件
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Write Review */}
                    {isAuthenticated && (
                      <div className="rounded-xl border p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">
                            {myReview ? 'レビューを編集' : 'レビューを投稿'}
                          </h3>
                          <Button
                            variant={showReviewForm ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => setShowReviewForm(!showReviewForm)}
                          >
                            {showReviewForm ? 'キャンセル' : myReview ? '編集する' : 'レビューを書く'}
                          </Button>
                        </div>
                        
                        {showReviewForm && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">評価</label>
                              <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                    className="focus:outline-none"
                                  >
                                    <Star
                                      className={`h-8 w-8 ${
                                        star <= reviewForm.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">タイトル（任意）</label>
                              <Input
                                value={reviewForm.title}
                                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                                placeholder="レビューの見出し"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">レビュー内容（任意）</label>
                              <textarea
                                value={reviewForm.content}
                                onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                                placeholder="このコースについてのご感想をお聞かせください"
                                className="mt-1 w-full min-h-[100px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <Button onClick={submitReview} disabled={submitReviewLoading}>
                              {submitReviewLoading ? '送信中...' : myReview ? '更新する' : '投稿する'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sort Reviews */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">レビュー一覧</h3>
                      <select
                        value={reviewSortBy}
                        onChange={(e) => {
                          setReviewSortBy(e.target.value);
                          loadReviews(params.id as string);
                        }}
                        className="border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="newest">新しい順</option>
                        <option value="oldest">古い順</option>
                        <option value="highest">評価の高い順</option>
                        <option value="lowest">評価の低い順</option>
                        <option value="helpful">参考になった順</option>
                      </select>
                    </div>

                    {/* Reviews List */}
                    {reviewsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-0">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                {review.avatarUrl ? (
                                  <img
                                    src={review.avatarUrl}
                                    alt={review.userName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{review.userName}</span>
                                  {review.isVerifiedPurchase && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      購入済み
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${
                                          star <= review.rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(review.createdAt)}
                                  </span>
                                </div>
                                {review.title && (
                                  <h4 className="font-semibold mt-2">{review.title}</h4>
                                )}
                                {review.content && (
                                  <p className="text-sm mt-1">{review.content}</p>
                                )}
                                <button
                                  onClick={() => markHelpful(review.id)}
                                  className="flex items-center gap-1 text-sm text-muted-foreground mt-3 hover:text-primary transition-colors"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  参考になった ({review.helpfulCount})
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        まだレビューがありません
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'qa' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Q&A</h2>
                      {isAuthenticated && (
                        <Link href={`/courses/${params.id}/questions/new`}>
                          <Button>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            質問する
                          </Button>
                        </Link>
                      )}
                    </div>
                    
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>このコースにはまだ質問がありません</p>
                      {isAuthenticated && (
                        <p className="text-sm mt-2">
                          わからないことがあれば、質問してみましょう
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
