'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Building2, 
  Users, 
  Clock, 
  ArrowRight,
  Calculator,
  HelpCircle
} from 'lucide-react';

export default function SubsidyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            リスキリング助成金で<br />最大75%OFF
          </h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            厚生労働省の人材開発支援助成金を活用して、
            お得に学習を始めましょう
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                対象コースを見る
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                お問い合わせ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Subsidy */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">リスキリング助成金とは？</h2>
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              リスキリング助成金（人材開発支援助成金）は、従業員のスキルアップを支援するために
              厚生労働省が提供する助成制度です。企業が従業員に対して職業訓練を実施した場合、
              訓練経費や訓練期間中の賃金の一部が助成されます。
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">経費助成</h3>
                  <p className="text-gray-600">訓練経費の最大75%が助成されます（中小企業の場合）</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">賃金助成</h3>
                  <p className="text-gray-600">訓練期間中の賃金の一部も助成対象になります</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">助成金のメリット</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">コスト削減</h3>
              <p className="text-gray-600">
                最大75%の助成により、大幅なコスト削減が可能です
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">人材育成</h3>
              <p className="text-gray-600">
                従業員のスキルアップにより、企業競争力が向上します
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">企業成長</h3>
              <p className="text-gray-600">
                DX人材の育成により、企業のデジタル化を推進できます
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">申請の流れ</h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                { step: 1, title: 'お問い合わせ', desc: 'まずはお気軽にお問い合わせください。専門スタッフが対応いたします。' },
                { step: 2, title: '訓練計画の作成', desc: '助成金の要件に沿った訓練計画を一緒に作成します。' },
                { step: 3, title: '計画届の提出', desc: '労働局へ訓練計画届を提出します（訓練開始1ヶ月前まで）。' },
                { step: 4, title: '訓練の実施', desc: '計画に基づいて訓練を実施します。当社のeラーニングで効率的に学習。' },
                { step: 5, title: '支給申請', desc: '訓練終了後、支給申請書を提出します。' },
                { step: 6, title: '助成金の受給', desc: '審査完了後、助成金が支給されます。' },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                    {item.step}
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">主な要件</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-50 rounded-xl p-8">
              <ul className="space-y-4">
                {[
                  '雇用保険の適用事業所であること',
                  '訓練計画を事前に労働局に届け出ること',
                  '訓練期間中も賃金を支払うこと',
                  '訓練時間が10時間以上であること',
                  '過去に同一の訓練を受けていないこと',
                ].map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    要件の詳細は事業規模や訓練内容によって異なります。
                    詳しくはお問い合わせください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligible Courses */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">助成金対象コース</h2>
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-6">
              当プラットフォームでは、助成金対象となるコースを多数ご用意しています。
            </p>
            <Link href="/courses">
              <Button size="lg">
                対象コースを見る
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-green-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            助成金の活用をサポートします
          </h2>
          <p className="text-green-100 mb-8 max-w-2xl mx-auto">
            申請手続きから訓練の実施まで、専門スタッフがトータルサポート。
            まずはお気軽にご相談ください。
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              無料相談を申し込む
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
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
