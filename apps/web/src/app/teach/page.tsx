import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Users, 
  Clock, 
  Award,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function TeachPage() {
  const benefits = [
    {
      icon: DollarSign,
      title: '高い収益還元',
      description: '売上の最大70%を講師に還元。透明性の高い報酬体系です。',
    },
    {
      icon: Users,
      title: '幅広い受講者層',
      description: '個人から法人まで、多様な学習者にリーチできます。',
    },
    {
      icon: Clock,
      title: '自由な働き方',
      description: 'いつでもどこでもコンテンツを作成。副業としても最適です。',
    },
    {
      icon: Award,
      title: '充実のサポート',
      description: 'コース作成から収益化まで、専任チームがサポートします。',
    },
  ];

  const steps = [
    { step: 1, title: '講師登録', description: 'プロフィールと専門分野を登録' },
    { step: 2, title: 'コース企画', description: 'カリキュラムを設計' },
    { step: 3, title: 'コンテンツ作成', description: '動画・教材を作成' },
    { step: 4, title: '審査・公開', description: '品質チェック後に公開' },
    { step: 5, title: '収益化', description: '受講者が増えるほど収益アップ' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-20">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold">
                あなたの知識を、<br />
                世界に届けよう
              </h1>
              <p className="text-xl text-muted-foreground mt-4">
                専門知識を活かして講師として活躍しませんか？<br />
                オンラインで自由に教えて、収益を得られます。
              </p>
              <Link href="/instructor">
                <Button size="lg" className="mt-8 gap-2">
                  講師登録を始める
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20">
          <div className="container">
            <h2 className="text-3xl font-bold text-center">講師になるメリット</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{benefit.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 bg-muted/30">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-center">講師になるまでの流れ</h2>
            <div className="mt-12 space-y-4">
              {steps.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-background">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-20">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-center">応募条件</h2>
            <div className="mt-8 grid gap-4">
              {[
                '特定分野での専門知識・実務経験をお持ちの方',
                '質の高いコンテンツを作成できる方',
                '受講者からの質問に丁寧に対応できる方',
                '継続的にコンテンツを更新・改善できる方',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg border">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold">今すぐ講師登録を始めましょう</h2>
            <p className="mt-4 text-primary-foreground/80">
              登録は無料。あなたの知識を待っている学習者がいます。
            </p>
            <Link href="/instructor">
              <Button size="lg" variant="secondary" className="mt-8">
                講師登録する
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
