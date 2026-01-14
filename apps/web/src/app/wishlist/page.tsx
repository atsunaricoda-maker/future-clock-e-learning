'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Heart, Star, Users, Trash2, ShoppingCart } from 'lucide-react';

interface WishlistItem {
  id: string;
  addedAt: string;
  course: {
    id: string;
    title: string;
    subtitle: string;
    slug: string;
    thumbnailUrl: string;
    price: number;
    currency: string;
    averageRating: number;
    totalReviews: number;
    totalEnrollments: number;
    level: string;
    instructorName: string;
  };
}

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/sign-in');
      } else {
        loadWishlist();
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const loadWishlist = async () => {
    setIsLoading(true);
    const response = await api.getWishlist();
    if (response.success && response.data) {
      setItems(response.data.items);
    }
    setIsLoading(false);
  };

  const removeFromWishlist = async (courseId: string) => {
    setRemovingId(courseId);
    const response = await api.removeFromWishlist(courseId);
    if (response.success) {
      setItems(items.filter((item) => item.course.id !== courseId));
    }
    setRemovingId(null);
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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">ウィッシュリスト</h1>
              <p className="text-muted-foreground mt-1">
                {items.length}件のコースを保存中
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 border rounded-xl">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">ウィッシュリストは空です</h2>
              <p className="text-muted-foreground mb-6">
                気になるコースを見つけたら、ハートアイコンをクリックして保存しましょう
              </p>
              <Link href="/courses">
                <Button>コースを探す</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <Link href={`/courses/${item.course.id}`} className="flex-shrink-0">
                    <div className="w-40 h-24 bg-muted rounded-lg overflow-hidden">
                      {item.course.thumbnailUrl ? (
                        <img
                          src={item.course.thumbnailUrl}
                          alt={item.course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/courses/${item.course.id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                        {item.course.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {item.course.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      講師: {item.course.instructorName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{item.course.averageRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({item.course.totalReviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{item.course.totalEnrollments.toLocaleString()}人</span>
                      </div>
                      <span className="text-muted-foreground">
                        {getLevelLabel(item.course.level)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      追加日: {formatDate(item.addedAt)}
                    </p>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <div className="text-xl font-bold">
                      {formatPrice(item.course.price, item.course.currency)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeFromWishlist(item.course.id)}
                        disabled={removingId === item.course.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Link href={`/courses/${item.course.id}`}>
                        <Button>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          購入する
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
