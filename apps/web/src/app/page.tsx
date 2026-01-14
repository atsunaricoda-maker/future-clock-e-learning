import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Play,
  Award,
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">e-Learning</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/courses" className="text-sm font-medium hover:text-primary">
              コース
            </Link>
            <Link href="/instructors" className="text-sm font-medium hover:text-primary">
              講師
            </Link>
            <Link href="/business" className="text-sm font-medium hover:text-primary">
              法人向け
            </Link>
            <Link href="/pricing" className="text-sm font-medium hover:text-primary">
              料金
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/sign-in">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/sign-up">
              <Button>新規登録</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              学びの未来を、
              <span className="text-primary">ここから。</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              リスキリング助成金対応 ・ オンライン×オフライン
              <br />
              質の高い学びを、すべての人に。
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/courses">
                <Button size="lg" className="gap-2">
                  コースを探す
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline">
                  法人プランを見る
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                助成金で最大75%還元
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                5名から法人契約可能
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                修了証発行対応
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">選ばれる理由</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">質の高いコンテンツ</h3>
              <p className="mt-2 text-muted-foreground">
                厳選された講師陣による、実践的なスキルが身につく動画講座を提供します。
              </p>
            </div>
            <div className="rounded-xl bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Award className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">助成金完全対応</h3>
              <p className="mt-2 text-muted-foreground">
                人材開発支援助成金に対応。受講時間ログ、修了証など必要書類を自動生成します。
              </p>
            </div>
            <div className="rounded-xl bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">法人向け管理機能</h3>
              <p className="mt-2 text-muted-foreground">
                5名から導入可能。進捗管理、レポート機能で社員の学習状況を一元管理できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center text-primary-foreground md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              今すぐ学習を始めましょう
            </h2>
            <p className="mt-4 text-primary-foreground/90">
              無料のアカウント登録で、プレビュー動画や無料コースをすぐにご覧いただけます。
            </p>
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="mt-6 bg-white text-primary hover:bg-white/90"
              >
                無料で登録する
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center space-x-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="font-bold">e-Learning</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                学びの民主化と講師への正当な還元を両立する、
                日本発のe-learningプラットフォーム
              </p>
            </div>
            <div>
              <h4 className="font-semibold">サービス</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/courses" className="hover:text-foreground">コース一覧</Link></li>
                <li><Link href="/instructors" className="hover:text-foreground">講師一覧</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">料金プラン</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">法人のお客様</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/business" className="hover:text-foreground">法人プラン</Link></li>
                <li><Link href="/subsidy" className="hover:text-foreground">助成金について</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">お問い合わせ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">講師の方へ</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/teach" className="hover:text-foreground">講師になる</Link></li>
                <li><Link href="/instructor/guide" className="hover:text-foreground">講師ガイド</Link></li>
                <li><Link href="/instructor/support" className="hover:text-foreground">サポート</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 FutureClock Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
