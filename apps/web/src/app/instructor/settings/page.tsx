'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, User, Briefcase, CreditCard, Globe, CheckCircle } from 'lucide-react';

interface Profile {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
}

interface InstructorProfile {
  headline: string | null;
  expertise: string | null;
  experience: string | null;
  socialLinks: { twitter?: string; linkedin?: string; youtube?: string } | null;
  website: string | null;
  payoutEnabled: boolean;
  commissionRate: number;
  totalEarnings: number;
  pendingBalance: number;
}

export default function InstructorSettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    displayName: '',
    firstName: '',
    lastName: '',
    avatarUrl: '',
    bio: '',
    timezone: 'Asia/Tokyo',
    language: 'ja',
  });

  const [instructorProfile, setInstructorProfile] = useState<InstructorProfile>({
    headline: '',
    expertise: '',
    experience: '',
    socialLinks: { twitter: '', linkedin: '', youtube: '' },
    website: '',
    payoutEnabled: false,
    commissionRate: 70,
    totalEarnings: 0,
    pendingBalance: 0,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSettings();
    }
  }, [authLoading, isAuthenticated]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getInstructorSettings();
      if (response.success && response.data) {
        if (response.data.profile) {
          setProfile(prev => ({ ...prev, ...response.data!.profile }));
        }
        if (response.data.instructorProfile) {
          setInstructorProfile(prev => ({ ...prev, ...response.data!.instructorProfile }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Use default values
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await api.updateInstructorSettings({
        profile: {
          displayName: profile.displayName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          bio: profile.bio,
          timezone: profile.timezone,
          language: profile.language,
        },
        instructorProfile: {
          headline: instructorProfile.headline,
          expertise: instructorProfile.expertise,
          experience: instructorProfile.experience,
          socialLinks: instructorProfile.socialLinks,
          website: instructorProfile.website,
        },
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.error?.message || '保存に失敗しました');
      }
    } catch (err) {
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect=/instructor/settings';
    }
    return null;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">講師設定</h1>
        <p className="text-muted-foreground mt-1">プロフィールや支払い設定を管理します</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          設定を保存しました
        </div>
      )}

      {/* 基本プロフィール */}
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold">基本プロフィール</h2>
            <p className="text-sm text-muted-foreground">公開される講師情報</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">表示名</label>
            <Input
              value={profile.displayName || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="山田 太郎"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">メールアドレス</label>
            <Input value={user?.email || ''} disabled className="bg-gray-50" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">姓</label>
            <Input
              value={profile.lastName || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="山田"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">名</label>
            <Input
              value={profile.firstName || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="太郎"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">自己紹介</label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="あなたの経歴や専門分野について教えてください"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* 講師プロフィール */}
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Briefcase className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold">講師プロフィール</h2>
            <p className="text-sm text-muted-foreground">専門性や経験をアピール</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">ヘッドライン</label>
          <Input
            value={instructorProfile.headline || ''}
            onChange={(e) => setInstructorProfile(prev => ({ ...prev, headline: e.target.value }))}
            placeholder="例: 10年以上のWeb開発経験を持つフルスタックエンジニア"
          />
          <p className="text-xs text-muted-foreground">コースページで表示される一言紹介</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">専門分野</label>
          <textarea
            value={instructorProfile.expertise || ''}
            onChange={(e) => setInstructorProfile(prev => ({ ...prev, expertise: e.target.value }))}
            placeholder="例: React, TypeScript, Node.js, AWS"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">経歴・実績</label>
          <textarea
            value={instructorProfile.experience || ''}
            onChange={(e) => setInstructorProfile(prev => ({ ...prev, experience: e.target.value }))}
            placeholder="これまでの経験や実績を記載してください"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* SNS・ウェブサイト */}
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <Globe className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold">SNS・ウェブサイト</h2>
            <p className="text-sm text-muted-foreground">外部リンクを設定</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ウェブサイト</label>
            <Input
              value={instructorProfile.website || ''}
              onChange={(e) => setInstructorProfile(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">X (Twitter)</label>
            <Input
              value={instructorProfile.socialLinks?.twitter || ''}
              onChange={(e) => setInstructorProfile(prev => ({
                ...prev,
                socialLinks: { ...prev.socialLinks, twitter: e.target.value }
              }))}
              placeholder="https://twitter.com/username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">LinkedIn</label>
            <Input
              value={instructorProfile.socialLinks?.linkedin || ''}
              onChange={(e) => setInstructorProfile(prev => ({
                ...prev,
                socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
              }))}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">YouTube</label>
            <Input
              value={instructorProfile.socialLinks?.youtube || ''}
              onChange={(e) => setInstructorProfile(prev => ({
                ...prev,
                socialLinks: { ...prev.socialLinks, youtube: e.target.value }
              }))}
              placeholder="https://youtube.com/@username"
            />
          </div>
        </div>
      </div>

      {/* 支払い設定 */}
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <CreditCard className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="font-semibold">支払い設定</h2>
            <p className="text-sm text-muted-foreground">収益の振込に関する情報</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">収益分配率</p>
            <p className="text-2xl font-bold text-green-600">{instructorProfile.commissionRate}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">未払い残高</p>
            <p className="text-2xl font-bold">¥{instructorProfile.pendingBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>振込スケジュール:</strong> 月末締め、翌月末払い<br />
            <strong>最低支払い額:</strong> ¥1,000<br />
            <strong>振込手数料:</strong> プラットフォーム負担（講師負担なし）
          </p>
        </div>

        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
          instructorProfile.payoutEnabled ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {instructorProfile.payoutEnabled ? (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>支払い設定が完了しています</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>銀行口座情報を設定して振込を受け取りましょう（管理者にお問い合わせください）</span>
            </>
          )}
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => fetchSettings()}>
          リセット
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
