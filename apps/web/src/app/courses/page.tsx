'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Search, Star, Users, Clock, Filter } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  instructor: {
    id: string;
    name: string;
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
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    const response = await api.getCourses();
    if (response.success && response.data) {
      setCourses(response.data.courses);
    }
    setIsLoading(false);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container">
            <h1 className="text-3xl font-bold">コース一覧</h1>
            <p className="text-muted-foreground mt-2">
              あなたのキャリアを加速させる高品質なコースを見つけましょう
            </p>
            
            {/* Search Bar */}
            <div className="mt-6 flex gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="コースを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                フィルター
              </Button>
            </div>
          </div>
        </section>

        {/* Course Grid */}
        <section className="py-12">
          <div className="container">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">コースが見つかりませんでした</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group"
                  >
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-muted relative">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                          {getLevelLabel(course.level)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="text-xs text-muted-foreground mb-1">
                          {course.category.name}
                        </div>
                        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {course.instructor.name}
                        </p>

                        {/* Rating */}
                        <div className="flex items-center gap-1 mt-2">
                          <span className="font-semibold text-sm">
                            {course.averageRating.toFixed(1)}
                          </span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= Math.round(course.averageRating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({course.totalReviews})
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(course.totalDuration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {course.totalEnrollments.toLocaleString()}人
                          </span>
                        </div>

                        {/* Price */}
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-lg font-bold">
                            {formatPrice(course.price, course.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
