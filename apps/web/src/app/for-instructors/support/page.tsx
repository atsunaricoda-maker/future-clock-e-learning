'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Mail, 
  FileText, 
  Video,
  HelpCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Users
} from 'lucide-react';

export default function InstructorSupportPage() {
  const supportResources = [
    {
      icon: FileText,
      title: 'ヘルプセンター',
      description: 'よくある質問と詳細なガイドをご覧いただけます',
      action: 'ヘルプを見る',
      href: '/instructor/guide',
    },
    {
      icon: Video,
      title: 'チュートリアル動画',
      description: 'コース作成の手順を動画で学べます',
      action: '動画を見る',
      href: '#',
    },
    {
      icon: Users,
      title: 'コミュニティ',
      description: '他の講師と情報交換や相談ができます',
      action: '参加する',
      href: '#',
    },
  ];

  const faqItems = [
    {
      question: 'コースの審査にはどのくらい時間がかかりますか？',
      answer: '通常3〜5営業日以内に審査が完了します。審査結果はメールでお知らせします。',
    },
    {
      question: '収益の振込はいつ行われますか？',
      answer: '毎月末締め、翌月20日払いです。最低振込金額は5,000円からとなります。',
    },
    {
      question: 'コースの価格設定に制限はありますか？',
      answer: '価格は500円〜50,000円の範囲で設定できます。無料コースも公開可能です。',
    },
    {
      question: 'コースの内容を後から変更できますか？',
      answer: 'はい、いつでも変更可能です。ただし、大幅な変更の場合は再審査が必要な場合があります。',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">講師サポート</h1>
          <p className="text-xl text-purple-100">
            コース作成から収益化まで、あなたをサポートします
          </p>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">メールサポート</h3>
              <p className="text-sm text-gray-600 mb-2">instructor@futureclock.co.jp</p>
              <p className="text-xs text-gray-500">24時間受付・2営業日以内に返信</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">チャットサポート</h3>
              <p className="text-sm text-gray-600 mb-2">平日 10:00〜18:00</p>
              <p className="text-xs text-gray-500">リアルタイムでご相談いただけます</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">個別相談</h3>
              <p className="text-sm text-gray-600 mb-2">オンラインミーティング</p>
              <p className="text-xs text-gray-500">事前予約制・30分無料</p>
            </div>
          </div>
        </div>
      </section>

      {/* Support Resources */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">サポートリソース</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {supportResources.map((resource, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <resource.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                <Link href={resource.href} className="text-purple-600 font-medium text-sm hover:underline inline-flex items-center">
                  {resource.action}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">よくある質問</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">{item.question}</h3>
                    <p className="text-gray-600 text-sm">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/instructor/guide">
              <Button variant="outline">
                <BookOpen className="w-5 h-5 mr-2" />
                すべてのFAQを見る
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-12 text-white">
            <h2 className="text-2xl font-bold mb-4">お困りですか？</h2>
            <p className="text-purple-100 mb-8">
              専門のサポートチームが、あなたの疑問にお答えします。
              お気軽にお問い合わせください。
            </p>
            <Link href="/contact">
              <Button variant="secondary" size="lg">
                お問い合わせ
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">© 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
