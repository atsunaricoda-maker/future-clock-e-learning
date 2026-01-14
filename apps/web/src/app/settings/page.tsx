'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Globe, 
  CreditCard,
  Shield,
  Loader2,
  Save,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/sign-in?redirect=/settings';
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'プロフィール', icon: User },
    { id: 'account', label: 'アカウント', icon: Mail },
    { id: 'password', label: 'パスワード', icon: Lock },
    { id: 'notifications', label: '通知設定', icon: Bell },
    { id: 'language', label: '言語・地域', icon: Globe },
    { id: 'billing', label: '請求情報', icon: CreditCard },
    { id: 'privacy', label: 'プライバシー', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">設定</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">プロフィール設定</h2>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                    <Button variant="outline">画像を変更</Button>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">表示名</label>
                      <Input defaultValue={user.name} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">自己紹介</label>
                      <textarea 
                        className="w-full px-3 py-2 border rounded-lg resize-none"
                        rows={4}
                        placeholder="自己紹介を入力してください"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">アカウント設定</h2>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">メールアドレス</label>
                      <Input defaultValue={user.email} type="email" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">ユーザーID</label>
                      <Input value={user.id} disabled className="bg-gray-50" />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-red-600 mb-2">危険な操作</h3>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      アカウントを削除
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">パスワード変更</h2>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">現在のパスワード</label>
                      <Input type="password" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">新しいパスワード</label>
                      <Input type="password" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">新しいパスワード（確認）</label>
                      <Input type="password" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">通知設定</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'コースの更新通知', desc: '受講中のコースが更新されたとき' },
                      { label: '新着コース通知', desc: 'お気に入りのカテゴリに新しいコースが追加されたとき' },
                      { label: 'プロモーション通知', desc: 'セールや割引情報' },
                      { label: '学習リマインダー', desc: '学習を継続するためのリマインド' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={index < 2} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">言語・地域設定</h2>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">表示言語</label>
                      <select className="w-full px-3 py-2 border rounded-lg">
                        <option value="ja">日本語</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">タイムゾーン</label>
                      <select className="w-full px-3 py-2 border rounded-lg">
                        <option value="Asia/Tokyo">日本標準時 (JST)</option>
                        <option value="UTC">協定世界時 (UTC)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">請求情報</h2>
                  <div className="p-6 border rounded-lg text-center">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">支払い方法が登録されていません</p>
                    <Button>支払い方法を追加</Button>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">プライバシー設定</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'プロフィールを公開', desc: '他のユーザーがあなたのプロフィールを閲覧できます' },
                      { label: '学習状況を公開', desc: '学習の進捗状況を他のユーザーに表示します' },
                      { label: '修了証を公開', desc: '取得した修了証を他のユーザーに表示します' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={index === 0} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t flex items-center gap-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      変更を保存
                    </>
                  )}
                </Button>
                {saved && (
                  <span className="text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    保存しました
                  </span>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
