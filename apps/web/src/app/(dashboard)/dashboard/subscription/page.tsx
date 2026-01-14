'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  ArrowRight,
  Crown,
  Zap,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  planSlug: string;
  billingCycle: 'monthly' | 'yearly';
  status: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export default function SubscriptionPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in?redirect=/dashboard/subscription');
      return;
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subResponse, paymentsResponse] = await Promise.all([
        api.getMySubscription(),
        api.getSubscriptionPayments({ limit: 10 }),
      ]);

      if (subResponse.success && subResponse.data) {
        setSubscription(subResponse.data.subscription);
      }

      if (paymentsResponse.success && paymentsResponse.data) {
        setPayments(paymentsResponse.data.payments);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('サブスクリプションをキャンセルしますか？\n現在の期間終了まではご利用いただけます。')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await api.cancelSubscription();
      if (response.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setCanceling(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      const response = await api.resumeSubscription();
      if (response.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    } finally {
      setResuming(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            有効
          </span>
        );
      case 'canceled':
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            キャンセル済み
          </span>
        );
      case 'past_due':
        return (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            支払い遅延
          </span>
        );
      case 'trialing':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            トライアル中
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'premium':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 'standard':
        return <Zap className="h-6 w-6 text-blue-500" />;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">サブスクリプション管理</h1>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* 現在のプラン */}
      <div className="rounded-xl border bg-card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          現在のプラン
        </h2>

        {subscription ? (
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {getPlanIcon(subscription.planSlug)}
                <div>
                  <h3 className="text-xl font-bold">{subscription.planName}</h3>
                  <p className="text-muted-foreground">
                    {subscription.billingCycle === 'monthly' ? '月額' : '年額'}プラン
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatPrice(
                    subscription.billingCycle === 'monthly'
                      ? subscription.priceMonthly
                      : subscription.priceYearly
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  /{subscription.billingCycle === 'monthly' ? '月' : '年'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              {getStatusBadge(subscription.status)}
              {subscription.cancelAtPeriodEnd && (
                <span className="text-sm text-yellow-600">
                  ※ 期間終了時にキャンセルされます
                </span>
              )}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="text-muted-foreground">現在の期間:</span>
                <span>
                  {formatDate(subscription.currentPeriodStart)} 〜{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
              {subscription.trialEnd && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <span className="text-muted-foreground">トライアル終了:</span>
                  <span>{formatDate(subscription.trialEnd)}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">プラン特典</h4>
              <ul className="space-y-2">
                {subscription.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex gap-4">
              {subscription.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  onClick={handleResume}
                  disabled={resuming}
                >
                  {resuming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    'サブスクリプションを再開'
                  )}
                </Button>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button variant="outline">
                      プランを変更
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleCancel}
                    disabled={canceling}
                  >
                    {canceling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      'キャンセル'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              現在サブスクリプションに加入していません
            </p>
            <Link href="/pricing">
              <Button>
                プランを見る
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 支払い履歴 */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">支払い履歴</h2>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    日付
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    プラン
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    期間
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    金額
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="py-3 px-4 text-sm">{payment.planName}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDate(payment.billingPeriodStart)} 〜{' '}
                      {formatDate(payment.billingPeriodEnd)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {formatPrice(payment.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {payment.status === 'succeeded' ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          完了
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          {payment.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            支払い履歴がありません
          </p>
        )}
      </div>
    </div>
  );
}
