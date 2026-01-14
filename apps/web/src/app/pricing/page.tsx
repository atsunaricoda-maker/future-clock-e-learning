'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { CheckCircle2, HelpCircle, Loader2, Sparkles, Zap, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxCourses: number | null;
}

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    loadPlans();
    if (isAuthenticated) {
      loadCurrentSubscription();
    }
  }, [isAuthenticated]);

  const loadPlans = async () => {
    try {
      const response = await api.getSubscriptionPlans();
      if (response.success && response.data) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const response = await api.getMySubscription();
      if (response.success && response.data) {
        setCurrentSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push(`/sign-up?plan=${planId}&billing=${billingCycle}`);
      return;
    }

    setSubscribing(planId);
    try {
      const response = await api.subscribe({
        planId,
        billingCycle,
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (response.success && response.data) {
        if (response.data.url) {
          // Stripe Checkout URLにリダイレクト
          window.location.href = response.data.url;
        } else {
          // 開発モードでは直接サブスクリプション成功
          router.push('/dashboard?subscription=success');
        }
      }
    } catch (error) {
      console.error('Subscribe error:', error);
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'premium':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 'standard':
        return <Zap className="h-6 w-6 text-blue-500" />;
      default:
        return <Sparkles className="h-6 w-6 text-gray-400" />;
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  const faqs = [
    {
      q: '無料プランでどこまで学べますか？',
      a: '無料コースは完全に無料でご利用いただけます。有料コースは購入または定額プランへの加入が必要です。',
    },
    {
      q: 'プランの変更はできますか？',
      a: 'はい、いつでもプランの変更が可能です。アップグレードは即座に反映され、ダウングレードは次の請求日から適用されます。',
    },
    {
      q: '返金保証はありますか？',
      a: 'はい、全てのコースに30日間の返金保証があります。満足いただけなかった場合は全額返金いたします。',
    },
    {
      q: '助成金は使えますか？',
      a: '対象コースは人材開発支援助成金（リスキリング支援コース）に対応しています。最大75%の助成を受けられる場合があります。',
    },
    {
      q: '年間プランと月間プランの違いは？',
      a: '年間プランは月間プランよりお得に利用できます（約2ヶ月分無料）。支払いは年1回となります。',
    },
  ];

  // 無料プランを静的に定義
  const freePlan = {
    id: 'free',
    name: '無料',
    slug: 'free',
    description: '学習を始めたい方に',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'JPY',
    features: [
      '無料コースへのアクセス',
      'コース進捗の保存',
      'コミュニティへの参加',
    ],
    maxCourses: null,
  };

  const allPlans = [freePlan, ...plans];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 text-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container">
            <h1 className="text-4xl font-bold">シンプルな料金プラン</h1>
            <p className="text-xl text-muted-foreground mt-4">
              あなたの学習スタイルに合ったプランをお選びください
            </p>
            
            {/* 課金サイクル切り替え */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg transition ${
                  billingCycle === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                月額
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg transition relative ${
                  billingCycle === 'yearly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                年額
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  お得
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 -mt-8">
          <div className="container">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {allPlans.map((plan) => {
                  const isPremium = plan.slug === 'premium';
                  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                  const monthlyEquivalent = billingCycle === 'yearly' ? Math.floor(plan.priceYearly / 12) : plan.priceMonthly;
                  const savings = billingCycle === 'yearly' && plan.priceMonthly > 0 
                    ? plan.priceMonthly * 12 - plan.priceYearly 
                    : 0;

                  return (
                    <div 
                      key={plan.id} 
                      className={`rounded-xl border bg-card p-6 relative ${
                        isPremium ? 'ring-2 ring-primary scale-105 shadow-xl' : ''
                      } ${isCurrentPlan(plan.id) ? 'bg-primary/5' : ''}`}
                    >
                      {isPremium && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            おすすめ
                          </span>
                        </div>
                      )}
                      
                      {isCurrentPlan(plan.id) && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            現在のプラン
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-center mb-4 pt-2">
                        {getPlanIcon(plan.slug)}
                      </div>
                      
                      <h3 className="text-xl font-semibold text-center">{plan.name}</h3>
                      <p className="text-center text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </p>
                      
                      <div className="text-center mt-6">
                        <div className="text-4xl font-bold">
                          {price === 0 ? '¥0' : formatPrice(price)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {price === 0 ? '永久無料' : `${billingCycle === 'monthly' ? '月額' : '年額'}`}
                        </div>
                        {billingCycle === 'yearly' && price > 0 && (
                          <div className="mt-2">
                            <span className="text-sm text-muted-foreground">
                              月あたり {formatPrice(monthlyEquivalent)}
                            </span>
                            {savings > 0 && (
                              <div className="text-sm text-green-600 font-medium">
                                年間 {formatPrice(savings)} お得
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <ul className="mt-6 space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      {plan.slug === 'free' ? (
                        <Link href="/sign-up">
                          <Button 
                            className="w-full mt-6" 
                            variant="outline"
                          >
                            無料で始める
                          </Button>
                        </Link>
                      ) : isCurrentPlan(plan.id) ? (
                        <Button 
                          className="w-full mt-6" 
                          variant="outline"
                          disabled
                        >
                          現在利用中
                        </Button>
                      ) : (
                        <Button 
                          className="w-full mt-6" 
                          variant={isPremium ? 'default' : 'outline'}
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={subscribing === plan.id}
                        >
                          {subscribing === plan.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            `${plan.name}プランを始める`
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 単品購入セクション */}
        <section className="py-16 bg-muted/30">
          <div className="container text-center">
            <h2 className="text-2xl font-bold mb-4">コース単品購入も可能です</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              定額プランに加入せずに、興味のあるコースを個別に購入することもできます。
              購入したコースは永久にアクセス可能です。
            </p>
            <Link href="/courses">
              <Button variant="outline" size="lg">
                コースを探す
              </Button>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container">
            <h2 className="text-3xl font-bold text-center">よくある質問</h2>
            <div className="max-w-3xl mx-auto mt-12 space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border bg-card p-6">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">{faq.q}</h3>
                      <p className="text-muted-foreground mt-2">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">今すぐ学習を始めましょう</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              無料で始めて、必要に応じてアップグレード。
              あなたの学習をサポートします。
            </p>
            <Link href="/sign-up">
              <Button size="lg" variant="secondary">
                無料アカウントを作成
              </Button>
            </Link>
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
