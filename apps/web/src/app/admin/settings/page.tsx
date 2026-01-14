'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe,
  CreditCard,
  Bell,
  Database,
  Loader2,
  Save,
  Shield,
  Key,
  Mail,
  Server,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'email' | 'system'>('general');

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
    stripeEnabled: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    sendWelcomeEmail: true,
    sendEnrollmentEmail: true,
    sendCompletionEmail: true,
    sendPayoutEmail: true,
    sendReminderEmail: true,
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setMessage({ type: 'success', text: '設定を保存しました' });
    setSaving(false);
  };

  const tabs = [
    { id: 'general', label: '一般', icon: Globe },
    { id: 'payment', label: '支払い', icon: CreditCard },
    { id: 'email', label: 'メール', icon: Bell },
    { id: 'system', label: 'システム', icon: Database },
  ] as const;

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
          <p className="text-gray-500 mt-1">プラットフォームの設定を管理</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  一般設定
                </h3>
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
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-gray-700">サイト説明</label>
                  <Input
                    value={generalSettings.siteDescription}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })
                    }
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">デフォルト言語</label>
                    <select
                      value={generalSettings.defaultLanguage}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, defaultLanguage: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
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
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  支払い設定
                </h3>
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
                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Stripe設定
                  </h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="stripeEnabled"
                      checked={paymentSettings.stripeEnabled}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, stripeEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="stripeEnabled" className="text-sm text-gray-700">
                      Stripe決済を有効にする
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    APIキーは環境変数で設定してください
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  メール通知設定
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'sendWelcomeEmail', label: '新規登録時のウェルカムメール', description: 'ユーザーが新規登録した際に送信' },
                    { key: 'sendEnrollmentEmail', label: 'コース受講登録の確認メール', description: 'コースを購入・登録した際に送信' },
                    { key: 'sendCompletionEmail', label: 'コース完了の通知メール', description: 'コースを修了した際に送信（修了証含む）' },
                    { key: 'sendPayoutEmail', label: '講師への支払い通知メール', description: '講師への報酬支払い時に送信' },
                    { key: 'sendReminderEmail', label: '学習リマインダーメール', description: '一定期間学習していないユーザーに送信' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={item.key}
                        checked={emailSettings[item.key as keyof typeof emailSettings]}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, [item.key]: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 mt-1"
                      />
                      <div>
                        <label htmlFor={item.key} className="text-sm font-medium text-gray-700">
                          {item.label}
                        </label>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System Info */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Server className="h-5 w-5 text-gray-600" />
                  システム情報
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-4 w-4 text-blue-500" />
                      <p className="text-sm text-gray-500">データベース</p>
                    </div>
                    <p className="font-medium text-gray-900">Cloudflare D1</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-gray-500">ストレージ</p>
                    </div>
                    <p className="font-medium text-gray-900">Cloudflare R2</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Server className="h-4 w-4 text-purple-500" />
                      <p className="text-sm text-gray-500">動画配信</p>
                    </div>
                    <p className="font-medium text-gray-900">Cloudflare Stream</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm text-gray-500">ホスティング</p>
                    </div>
                    <p className="font-medium text-gray-900">Cloudflare Pages</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-600" />
                  API情報
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">API URL</span>
                    <code className="text-sm bg-white px-2 py-1 rounded border">
                      https://elearning-api.atsunari-coda.workers.dev
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">フロントエンド</span>
                    <code className="text-sm bg-white px-2 py-1 rounded border">
                      https://elearning-platform.pages.dev
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
