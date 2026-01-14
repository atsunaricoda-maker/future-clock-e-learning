'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Building2,
  ArrowRight,
  HelpCircle,
  FileText,
  Award,
  Phone,
  Mail,
  BookOpen,
  Briefcase,
  Shield,
  BarChart3,
  GraduationCap,
  Percent,
  Clock,
} from 'lucide-react';

export default function SubsidyPage() {
  // 助成金シミュレーター
  const subsidyRates = [
    { type: '中小企業', expenseRate: 75, wageRate: 960 },
    { type: '大企業', expenseRate: 60, wageRate: 480 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm text-sm px-4 py-2 rounded-full mb-6">
            厚生労働省認定 人材開発支援助成金対応
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            リスキリング助成金で<br />最大75%OFF
          </h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            FutureClockは助成金対応プラットフォームです。
            社労士紹介から申請サポートまで、ワンストップでご支援します。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses?subsidy=true">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                対象コースを見る
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact?type=subsidy">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                無料相談を申し込む
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">75%</p>
              <p className="text-sm text-muted-foreground">最大助成率</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">100+</p>
              <p className="text-sm text-muted-foreground">対象コース数</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">500+</p>
              <p className="text-sm text-muted-foreground">導入企業数</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">98%</p>
              <p className="text-sm text-muted-foreground">申請承認率</p>
            </div>
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
            
            {/* Rate Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="border border-green-200 px-4 py-3 text-left">企業規模</th>
                    <th className="border border-green-200 px-4 py-3 text-center">経費助成率</th>
                    <th className="border border-green-200 px-4 py-3 text-center">賃金助成（1人1時間）</th>
                  </tr>
                </thead>
                <tbody>
                  {subsidyRates.map((rate, index) => (
                    <tr key={index}>
                      <td className="border border-green-200 px-4 py-3 font-medium">{rate.type}</td>
                      <td className="border border-green-200 px-4 py-3 text-center">
                        <span className="text-2xl font-bold text-green-600">{rate.expenseRate}%</span>
                      </td>
                      <td className="border border-green-200 px-4 py-3 text-center">
                        <span className="font-semibold">¥{rate.wageRate}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>※ DX推進・デジタルリスキリング訓練</strong>の場合、さらに高い助成率が適用される場合があります。
                詳細はお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FutureClock Advantages */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">FutureClockが選ばれる理由</h2>
          <p className="text-center text-muted-foreground mb-12">助成金活用を完全サポート</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">社労士紹介サービス</h3>
              <p className="text-gray-600 mb-4">
                助成金申請に精通した社会保険労務士をご紹介。
                申請書類の作成から提出まで代行いたします。
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  成功報酬型の料金体系
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  初回相談無料
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">学習時間の自動記録</h3>
              <p className="text-gray-600 mb-4">
                助成金申請に必要な学習時間ログを自動で記録。
                証明書類も簡単にダウンロードできます。
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  リアルタイム学習記録
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  PDF/Excel出力対応
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">修了証の発行</h3>
              <p className="text-gray-600 mb-4">
                コース修了時に修了証を自動発行。
                QRコードで認証可能な公式証明書です。
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  QRコード認証対応
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  SNS共有機能
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">申請の流れ</h2>
          <p className="text-center text-muted-foreground mb-12">FutureClockなら6ステップで完了</p>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                { step: 1, title: '無料相談', desc: 'まずはお気軽にお問い合わせください。助成金の概要と対象コースをご説明します。', icon: Phone },
                { step: 2, title: '社労士マッチング', desc: '助成金申請に精通した社会保険労務士をご紹介。申請要件を確認します。', icon: Briefcase },
                { step: 3, title: '訓練計画の作成', desc: '社労士と連携し、助成金要件に沿った訓練計画を作成します。', icon: FileText },
                { step: 4, title: '計画届の提出', desc: '労働局へ訓練計画届を提出します（訓練開始1ヶ月前まで）。', icon: Building2 },
                { step: 5, title: '訓練の実施', desc: 'FutureClockのeラーニングで訓練を実施。学習時間は自動記録されます。', icon: BookOpen },
                { step: 6, title: '支給申請・受給', desc: '訓練終了後、社労士が支給申請を代行。審査完了後、助成金が支給されます。', icon: Award },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className="w-14 h-14 bg-green-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-lg">
                    {item.step}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border">
                    <div className="flex items-center gap-3 mb-2">
                      <item.icon className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                    </div>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cost Simulator */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">助成金シミュレーション</h2>
          <p className="text-center text-muted-foreground mb-12">実際にどのくらいお得になるか確認しましょう</p>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
              <div className="text-center mb-6">
                <p className="text-sm text-green-600 mb-2">例：中小企業で1名が100時間のDX研修を受講した場合</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">コース費用</p>
                  <p className="text-2xl font-bold">¥298,000</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">経費助成（75%）</p>
                  <p className="text-2xl font-bold text-green-600">-¥223,500</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">賃金助成（100h×¥960）</p>
                  <p className="text-2xl font-bold text-green-600">-¥96,000</p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <div className="inline-block bg-green-600 text-white rounded-xl px-8 py-4">
                  <p className="text-sm mb-1">実質負担額</p>
                  <p className="text-3xl font-bold">¥0以下</p>
                  <p className="text-xs text-green-200">（賃金助成も含めると）</p>
                </div>
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                ※ 上記は概算です。実際の助成金額は訓練内容や企業規模により異なります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">主な要件</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-sm border">
              <ul className="space-y-4">
                {[
                  '雇用保険の適用事業所であること',
                  '訓練計画を事前に労働局に届け出ること',
                  '訓練期間中も賃金を支払うこと',
                  '訓練時間が10時間以上であること',
                  'OFF-JT（座学）の訓練であること',
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
                  <div>
                    <p className="text-sm text-yellow-800 font-medium mb-1">
                      要件が複雑でお困りの方へ
                    </p>
                    <p className="text-sm text-yellow-700">
                      FutureClockでは社労士紹介サービスを提供しています。
                      要件確認から申請代行まで、専門家がサポートします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligible Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">対象となる訓練分野</h2>
          <p className="text-center text-muted-foreground mb-12">DX・IT分野を中心に幅広いコースが対象です</p>
          
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'プログラミング', icon: '💻' },
              { name: 'データサイエンス', icon: '📊' },
              { name: 'AI・機械学習', icon: '🤖' },
              { name: 'クラウド・インフラ', icon: '☁️' },
              { name: 'セキュリティ', icon: '🔐' },
              { name: 'デジタルマーケティング', icon: '📱' },
              { name: 'プロジェクト管理', icon: '📋' },
              { name: 'ビジネススキル', icon: '💼' },
            ].map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 text-center border hover:border-green-300 transition-colors">
                <span className="text-2xl mb-2 block">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link href="/courses?subsidy=true">
              <Button size="lg">
                対象コースを見る
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Insurance Lawyer */}
      <section className="py-16 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-white/10 backdrop-blur-sm text-sm px-4 py-2 rounded-full mb-6">
              社労士紹介サービス
            </div>
            <h2 className="text-3xl font-bold mb-6">
              助成金申請のプロにお任せください
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              FutureClockでは、助成金申請に精通した社会保険労務士をご紹介しています。
              申請書類の作成から労働局への提出まで、すべてお任せいただけます。
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Percent className="h-8 w-8 mb-4 mx-auto text-yellow-400" />
                <h3 className="font-semibold mb-2">成功報酬型</h3>
                <p className="text-sm text-blue-200">
                  助成金を受給できた場合のみ
                  手数料をいただきます
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Clock className="h-8 w-8 mb-4 mx-auto text-yellow-400" />
                <h3 className="font-semibold mb-2">スピード対応</h3>
                <p className="text-sm text-blue-200">
                  最短翌日に社労士と
                  マッチングいたします
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Shield className="h-8 w-8 mb-4 mx-auto text-yellow-400" />
                <h3 className="font-semibold mb-2">安心サポート</h3>
                <p className="text-sm text-blue-200">
                  申請から受給まで
                  一貫してサポート
                </p>
              </div>
            </div>
            
            <Link href="/contact?type=subsidy-lawyer">
              <Button size="lg" variant="secondary">
                社労士紹介を申し込む
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
            まずは無料相談から始めましょう
          </h2>
          <p className="text-green-100 mb-8 max-w-2xl mx-auto">
            助成金の活用方法から対象コースの選定まで、
            専門スタッフがご要望に合わせてご案内いたします。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact?type=subsidy">
              <Button size="lg" variant="secondary">
                <Phone className="w-5 h-5 mr-2" />
                無料相談を申し込む
              </Button>
            </Link>
            <Link href="mailto:subsidy@futureclock.jp">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Mail className="w-5 h-5 mr-2" />
                メールでお問い合わせ
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
