'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Shield,
  Globe,
  CreditCard,
  Bell,
  Database,
  Loader2,
  Save,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'FutureClock e-Learning',
    siteDescription: 'オンライン学習プラットフォーム',
    supportEmail: 'support@futureclock.jp',
    defaultLanguage: 'ja',
    maintenanceMode: false,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    defaultCurrency: 'JPY',
    instructorCommission: 30,
    minimumPayout: 5000,
    payoutDay: 15,
  });

  const [emailSettings, setEmailSettings] = useState({
    sendWelcomeEmail: true,
    sendEnrollmentEmail: true,
    sendCompletionEmail: true,
    sendPayoutEmail: true,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    return null;
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-4">このページは管理者専用です。</p>
          <Link href="/dashboard">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setMessage({ type: 'success', text: '設定を保存しました' });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
                <p className="text-gray-600 text-sm mt-1">プラットフォームの設定を管理</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              設定を保存
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">一般設定</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">サイト名</label>
                  <Input
                    value={generalSettings.siteName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">サポートメール</label>
                  <Input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">サイト説明</label>
                <Input
                  value={generalSettings.siteDescription}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="maintenance"
                  checked={generalSettings.maintenanceMode}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="maintenance" className="text-sm text-gray-700">
                  メンテナンスモードを有効にする
                </label>
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-gray-900">支払い設定</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">デフォルト通貨</label>
                  <select
                    value={paymentSettings.defaultCurrency}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, defaultCurrency: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="JPY">日本円 (JPY)</option>
                    <option value="USD">米ドル (USD)</option>
                    <option value="EUR">ユーロ (EUR)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    プラットフォーム手数料 (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={paymentSettings.instructorCommission}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        instructorCommission: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">最低支払金額</label>
                  <Input
                    type="number"
                    min="0"
                    value={paymentSettings.minimumPayout}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        minimumPayout: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">支払日（毎月）</label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={paymentSettings.payoutDay}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        payoutDay: parseInt(e.target.value) || 15,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">メール通知</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {[
                  { key: 'sendWelcomeEmail', label: '新規登録時のウェルカムメール' },
                  { key: 'sendEnrollmentEmail', label: 'コース受講登録の確認メール' },
                  { key: 'sendCompletionEmail', label: 'コース完了の通知メール' },
                  { key: 'sendPayoutEmail', label: '講師への支払い通知メール' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={emailSettings[item.key as keyof typeof emailSettings]}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, [item.key]: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={item.key} className="text-sm text-gray-700">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">システム情報</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">データベース</p>
                  <p className="font-medium text-gray-900">Cloudflare D1</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">ストレージ</p>
                  <p className="font-medium text-gray-900">Cloudflare R2</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">動画配信</p>
                  <p className="font-medium text-gray-900">Cloudflare Stream</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">ホスティング</p>
                  <p className="font-medium text-gray-900">Cloudflare Pages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
