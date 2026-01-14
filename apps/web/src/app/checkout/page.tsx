'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  ShoppingCart,
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Award,
  Play,
  Tag,
  ChevronLeft,
  Shield,
  Percent
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  thumbnailUrl?: string;
  instructor: {
    id: string;
    name: string;
  };
  totalDuration: number;
  totalLectures: number;
  level: string;
}

interface Coupon {
  couponId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  description: string;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const courseId = searchParams.get('courseId');
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  // Payment method (simplified for demo)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'convenience' | 'bank'>('card');
  
  // Card details (demo only - in production use Stripe Elements)
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  
  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/sign-in?redirect=/checkout?courseId=${courseId}`);
      return;
    }
    
    if (courseId) {
      loadCourse(courseId);
    }
  }, [courseId, isAuthenticated, authLoading, router]);

  const loadCourse = async (id: string) => {
    setIsLoading(true);
    const response = await api.getCourse(id);
    if (response.success && response.data) {
      setCourse(response.data);
    } else {
      setError('コースが見つかりません');
    }
    setIsLoading(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponError('');
    setIsValidatingCoupon(true);
    
    try {
      const response = await api.validateCoupon(couponCode, courseId || undefined);
      if (response.success && response.data) {
        setAppliedCoupon(response.data as Coupon);
      } else {
        setCouponError(response.error?.message || 'このクーポンは使用できません');
      }
    } catch {
      setCouponError('クーポンの検証に失敗しました');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
      all_levels: '全レベル'
    };
    return labels[level] || level;
  };

  const calculateTotal = () => {
    if (!course) return 0;
    const basePrice = course.price;
    if (appliedCoupon) {
      return Math.max(0, basePrice - appliedCoupon.discountAmount);
    }
    return basePrice;
  };

  const handlePurchase = async () => {
    if (!course || !agreedToTerms) return;
    
    setError('');
    setIsProcessing(true);
    
    try {
      // In production, this would create a Stripe checkout session
      // For now, we'll use the mock checkout endpoint
      const successUrl = `${window.location.origin}/checkout/success?courseId=${course.id}`;
      const cancelUrl = `${window.location.origin}/checkout?courseId=${course.id}`;
      
      const response = await api.createCheckoutSession(course.id, successUrl, cancelUrl);
      
      if (response.success && response.data) {
        // If we have a URL (Stripe hosted checkout), redirect
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          // Mock success - in production this would be handled by Stripe webhook
          // For demo purposes, directly enroll the user
          const enrollResponse = await api.enrollCourse(course.id);
          if (enrollResponse.success) {
            router.push(`/checkout/success?courseId=${course.id}`);
          } else {
            throw new Error(enrollResponse.error?.message || '受講登録に失敗しました');
          }
        }
      } else {
        throw new Error(response.error?.message || '決済処理を開始できませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '購入処理に失敗しました');
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">エラー</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/courses">
              <Button>コース一覧に戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const total = calculateTotal();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-5xl">
          {/* Back Link */}
          <Link 
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            コース詳細に戻る
          </Link>

          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            チェックアウト
          </h1>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Column - Payment Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Payment Method Selection */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-4">お支払い方法</h2>
                
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="h-4 w-4"
                    />
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="font-medium">クレジットカード</span>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, JCB, AMEX</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'convenience' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="convenience"
                      checked={paymentMethod === 'convenience'}
                      onChange={() => setPaymentMethod('convenience')}
                      className="h-4 w-4"
                    />
                    <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M9 8h6M9 12h6M9 16h4" />
                    </svg>
                    <div className="flex-1">
                      <span className="font-medium">コンビニ払い</span>
                      <p className="text-sm text-muted-foreground">セブンイレブン、ローソン、ファミリーマート等</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'bank' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={() => setPaymentMethod('bank')}
                      className="h-4 w-4"
                    />
                    <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18M4 18h16M6 15h12M9 15V8m6 7V8M12 8V3l8 5H4l8-5z" />
                    </svg>
                    <div className="flex-1">
                      <span className="font-medium">銀行振込</span>
                      <p className="text-sm text-muted-foreground">3営業日以内にお振込みください</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card Details (if card selected) */}
              {paymentMethod === 'card' && (
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">カード情報</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">カード番号</label>
                      <Input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                        maxLength={19}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">有効期限</label>
                        <Input
                          type="text"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          maxLength={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">セキュリティコード</label>
                        <Input
                          type="text"
                          placeholder="123"
                          value={cardDetails.cvc}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                          maxLength={4}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">カード名義人</label>
                      <Input
                        type="text"
                        placeholder="TARO YAMADA"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value.toUpperCase() })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>カード情報は安全に暗号化されます</span>
                  </div>
                </div>
              )}

              {/* Convenience Store Info */}
              {paymentMethod === 'convenience' && (
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">コンビニ払いについて</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      購入完了後、支払い番号をメールでお送りします
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      お近くのコンビニで7日以内にお支払いください
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      支払い確認後、すぐにコースにアクセスできます
                    </li>
                  </ul>
                </div>
              )}

              {/* Bank Transfer Info */}
              {paymentMethod === 'bank' && (
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">銀行振込について</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      購入完了後、振込先をメールでお送りします
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      3営業日以内にお振込みください
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      振込手数料はお客様負担となります
                    </li>
                  </ul>
                </div>
              )}

              {/* Terms Agreement */}
              <div className="bg-white rounded-xl border p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-4 w-4 mt-1 rounded"
                  />
                  <span className="text-sm">
                    <Link href="/terms" className="text-primary hover:underline" target="_blank">利用規約</Link>
                    および
                    <Link href="/privacy" className="text-primary hover:underline" target="_blank">プライバシーポリシー</Link>
                    に同意します
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Info */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-4">注文内容</h2>
                
                <div className="flex gap-4 pb-4 border-b">
                  <div className="w-24 h-14 bg-muted rounded-lg overflow-hidden shrink-0">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{course.instructor.name}</p>
                  </div>
                </div>

                <div className="py-4 space-y-2 text-sm border-b">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(course.totalDuration)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Play className="h-4 w-4" />
                    <span>{course.totalLectures}レッスン</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span>{getLevelLabel(course.level)}</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="py-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm font-medium">クーポン</span>
                  </div>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 text-green-700 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        <span className="font-medium">{appliedCoupon.code}</span>
                        <span className="text-sm">
                          ({appliedCoupon.discountType === 'percentage' 
                            ? `${appliedCoupon.discountValue}% OFF` 
                            : `-${formatPrice(appliedCoupon.discountValue)}`
                          })
                        </span>
                      </div>
                      <button 
                        onClick={removeCoupon}
                        className="text-sm hover:underline"
                      >
                        削除
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="クーポンコード"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                      >
                        {isValidatingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          '適用'
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {couponError && (
                    <p className="text-sm text-destructive mt-2">{couponError}</p>
                  )}
                </div>

                {/* Price Summary */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>小計</span>
                    <span>{formatPrice(course.price)}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>割引</span>
                      <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>合計</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <Button 
                className="w-full h-12 text-lg gap-2"
                disabled={!agreedToTerms || isProcessing}
                onClick={handlePurchase}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    {formatPrice(total)}で購入する
                  </>
                )}
              </Button>

              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium">安心の購入保証</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>30日間返金保証</li>
                  <li>SSL暗号化通信</li>
                  <li>買い切り型 - 追加料金なし</li>
                  <li>いつでもどこでも学習可能</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
