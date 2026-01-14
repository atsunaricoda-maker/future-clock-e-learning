import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { CheckCircle2, HelpCircle } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: '無料',
      price: '¥0',
      priceNote: '永久無料',
      description: '学習を始めたい方に',
      features: [
        '無料コースへのアクセス',
        'コース進捗の保存',
        'コミュニティへの参加',
      ],
      cta: '無料で始める',
      ctaLink: '/sign-up',
    },
    {
      name: 'プロ',
      price: '¥1,980',
      priceNote: '月額',
      description: '本格的に学びたい方に',
      popular: true,
      features: [
        '全コースへのアクセス',
        '修了証の発行',
        'ダウンロード教材',
        'Q&Aサポート',
        '学習パス機能',
      ],
      cta: 'プロを始める',
      ctaLink: '/sign-up?plan=pro',
    },
    {
      name: 'チーム',
      price: '¥4,980',
      priceNote: '月額/人（5名から）',
      description: 'チームで学習したい方に',
      features: [
        'プロの全機能',
        'チーム管理機能',
        '進捗レポート',
        '優先サポート',
        '請求書払い対応',
      ],
      cta: 'お問い合わせ',
      ctaLink: '/contact',
    },
  ];

  const faqs = [
    {
      q: '無料プランでどこまで学べますか？',
      a: '無料コースは完全に無料でご利用いただけます。有料コースは購入が必要です。',
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
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="container">
            <h1 className="text-4xl font-bold">シンプルな料金プラン</h1>
            <p className="text-xl text-muted-foreground mt-4">
              あなたの学習スタイルに合ったプランをお選びください
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`rounded-xl border bg-card p-6 ${
                    plan.popular ? 'ring-2 ring-primary scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="text-center mb-4">
                      <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                        おすすめ
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-center">{plan.name}</h3>
                  <p className="text-center text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                  <div className="text-center mt-6">
                    <div className="text-4xl font-bold">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">{plan.priceNote}</div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.ctaLink}>
                    <Button 
                      className="w-full mt-6" 
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-muted/30">
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
