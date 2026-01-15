'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Search, Star, Users, Clock, X, SlidersHorizontal } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
}

const LEVELS = [
  { value: 'all_levels', label: '全レベル' },
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
];

const PRICE_RANGES = [
  { value: '', label: '全ての価格' },
  { value: '0-0', label: '無料' },
  { value: '0-3000', label: '¥3,000以下' },
  { value: '3000-10000', label: '¥3,000 - ¥10,000' },
  { value: '10000-', label: '¥10,000以上' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: '人気順' },
  { value: 'newest', label: '新着順' },
  { value: 'highest_rated', label: '評価の高い順' },
  { value: 'price_low', label: '価格の低い順' },
  { value: 'price_high', label: '価格の高い順' },
];

const RATING_OPTIONS = [
  { value: '', label: '全ての評価' },
  { value: '4.5', label: '4.5以上' },
  { value: '4.0', label: '4.0以上' },
  { value: '3.5', label: '3.5以上' },
  { value: '3.0', label: '3.0以上' },
];

export default function CoursesPage() {
  const searchParams = useSearchParams();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState(searchParams.get('price') || '');
  const [selectedRating, setSelectedRating] = useState(searchParams.get('rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popular');

  useEffect(() => {
    loadCategories();
    loadCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedPriceRange, selectedRating, sortBy]);

  const loadCategories = async () => {
    const response = await api.getCategories();
    if (response.success && response.data) {
      setCategories(response.data.categories);
    }
  };

  const loadCourses = async () => {
    setIsLoading(true);
    const response = await api.getCourses({ limit: 100 });
    if (response.success && response.data) {
      setCourses(response.data.courses);
    }
    setIsLoading(false);
  };

  const applyFilters = useCallback(() => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.subtitle.toLowerCase().includes(query) ||
          course.instructor.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((course) => course.category.id === selectedCategory);
    }

    // Level filter
    if (selectedLevel) {
      filtered = filtered.filter((course) => course.level === selectedLevel);
    }

    // Price range filter
    if (selectedPriceRange) {
      const [min, max] = selectedPriceRange.split('-').map(Number);
      filtered = filtered.filter((course) => {
        if (max === 0) return course.price === 0; // Free courses
        if (!max) return course.price >= min; // No upper limit
        return course.price >= min && course.price <= max;
      });
    }

    // Rating filter
    if (selectedRating) {
      const minRating = parseFloat(selectedRating);
      filtered = filtered.filter((course) => course.averageRating >= minRating);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        // Assume newer courses have higher IDs (simplified)
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'highest_rated':
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
      default:
        filtered.sort((a, b) => b.totalEnrollments - a.totalEnrollments);
        break;
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedPriceRange, selectedRating, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLevel('');
    setSelectedPriceRange('');
    setSelectedRating('');
    setSortBy('popular');
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedLevel || selectedPriceRange || selectedRating;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return '無料';
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
            <div className="mt-6 flex gap-4 max-w-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="コース名、講師名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                フィルター
                {hasActiveFilters && (
                  <span className="ml-1 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                    {[selectedCategory, selectedLevel, selectedPriceRange, selectedRating].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Filters Panel */}
        {showFilters && (
          <section className="border-b py-4 bg-muted/30">
            <div className="container">
              <div className="flex flex-wrap gap-4">
                {/* Category Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-1 block">カテゴリ</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    <option value="">全てのカテゴリ</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.courseCount})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-1 block">レベル</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    <option value="">全てのレベル</option>
                    {LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-1 block">価格帯</label>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    {PRICE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium mb-1 block">評価</label>
                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    {RATING_OPTIONS.map((rating) => (
                      <option key={rating.value} value={rating.value}>
                        {rating.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      クリア
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Results Header */}
        <section className="border-b py-4">
          <div className="container flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredCourses.length}件のコースが見つかりました
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">並び替え:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? '条件に一致するコースが見つかりませんでした'
                    : 'コースが見つかりませんでした'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    フィルターをクリア
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group"
                  >
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-primary/60">
                            <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-xs font-medium">{course.category?.name || 'コース'}</span>
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
                          <span className={`text-lg font-bold ${course.price === 0 ? 'text-green-600' : ''}`}>
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
