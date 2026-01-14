import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Shield, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function BusinessPage() {
  const features = [
    {
      icon: Users,
      title: '一括管理',
      description: '社員の学習状況を一元管理。進捗レポートで効果を可視化します。',
    },
    {
      icon: BarChart3,
      title: '詳細な分析',
      description: '学習データの分析で、研修効果を測定。ROIを明確に把握できます。',
    },
    {
      icon: Shield,
      title: 'セキュリティ',
      description: 'SSO対応、IPアドレス制限など、企業のセキュリティ要件に対応。',
    },
  ];

  const plans = [
    {
      name: 'スタータープラン',
      price: '5名から',
      priceNote: '月額 ¥4,980/人',
      features: [
        '全コースアクセス',
        '進捗管理機能',
        'メールサポート',
        '修了証発行',
      ],
    },
    {
      name: 'ビジネスプラン',
      price: '20名から',
      priceNote: '月額 ¥3,980/人',
      popular: true,
      features: [
        'スタータープランの全機能',
        '専任サポート担当',
        'カスタムレポート',
        'API連携',
        '助成金申請サポート',
      ],
    },
    {
      name: 'エンタープライズ',
      price: '100名から',
      priceNote: 'お問い合わせ',
      features: [
        'ビジネスプランの全機能',
        'SSO/SAML対応',
        'カスタムコース作成',
        'オンサイト研修',
        'SLA保証',
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-20">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold">
                法人向けe-Learning
              </h1>
              <p className="text-xl text-muted-foreground mt-4">
                社員研修・リスキリングを効率化。<br />
                助成金対応で、コストを抑えた人材育成を実現します。
              </p>
              <div className="flex items-center justify-center gap-4 mt-8">
                <Link href="/contact">
                  <Button size="lg" className="gap-2">
                    お問い合わせ
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/business/demo">
                  <Button size="lg" variant="outline">
                    デモを予約
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container">
            <h2 className="text-3xl font-bold text-center">選ばれる理由</h2>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="text-center p-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground mt-2">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <h2 className="text-3xl font-bold text-center">料金プラン</h2>
            <p className="text-center text-muted-foreground mt-2">
              ご利用人数に応じた最適なプランをご提案します
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {plans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`rounded-xl border bg-card p-6 ${
                    plan.popular ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="text-center mb-4">
                      <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                        人気
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-center">{plan.name}</h3>
                  <div className="text-center mt-4">
                    <div className="text-3xl font-bold">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">{plan.priceNote}</div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    お問い合わせ
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <Building2 className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-3xl font-bold mt-4">
                まずはお気軽にご相談ください
              </h2>
              <p className="text-muted-foreground mt-2">
                専門スタッフが貴社の課題に合わせた最適なプランをご提案します
              </p>
              <div className="flex items-center justify-center gap-4 mt-8">
                <Link href="/contact">
                  <Button size="lg">
                    お問い合わせ
                  </Button>
                </Link>
              </div>
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
