'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  CheckCircle2, 
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  Users,
  Loader2
} from 'lucide-react';

export default function BusinessDemoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    employeeCount: '',
    preferredDate: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const employeeOptions = [
    { value: '5-19', label: '5〜19名' },
    { value: '20-49', label: '20〜49名' },
    { value: '50-99', label: '50〜99名' },
    { value: '100-299', label: '100〜299名' },
    { value: '300+', label: '300名以上' },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">デモ予約を受け付けました</h1>
            <p className="text-muted-foreground mt-4">
              ご入力いただいたメールアドレスに確認メールをお送りしました。
              担当者より2営業日以内にご連絡いたします。
            </p>
            <div className="mt-8 space-y-3">
              <Link href="/business">
                <Button variant="outline" className="w-full">
                  法人向けページに戻る
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  トップページに戻る
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-2xl">
          <Link href="/business" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            法人向けページに戻る
          </Link>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">デモ予約</h1>
            <p className="text-muted-foreground mt-2">
              専門スタッフがサービスの詳細をご説明します。<br />
              オンラインまたはオンサイトでのデモが可能です。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-xl border p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  会社名 <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="株式会社〇〇"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  担当者名 <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="山田 太郎"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  メールアドレス <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@company.co.jp"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  電話番号
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="03-1234-5678"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  想定利用人数 <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">選択してください</option>
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  希望日時
                </label>
                <Input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ご質問・ご要望</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="導入の背景や、特に確認したいポイントがあればお知らせください"
                rows={4}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">デモでご説明する内容</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• サービス概要と主要機能のご紹介</li>
                <li>• 管理者向け機能のデモンストレーション</li>
                <li>• 料金プランと導入スケジュールのご説明</li>
                <li>• 助成金活用についてのご案内</li>
                <li>• 質疑応答（30分程度）</li>
              </ul>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                'デモを予約する'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              ご入力いただいた情報は、デモのご案内にのみ使用いたします。<br />
              <Link href="/privacy" className="underline hover:text-foreground">
                プライバシーポリシー
              </Link>
              をご確認ください。
            </p>
          </form>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
