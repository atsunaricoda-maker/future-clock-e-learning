import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">e-Learning</span>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">利用規約</h1>
          
          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">第1条（適用）</h2>
              <p className="text-muted-foreground">
                本規約は、FutureClock株式会社（以下「当社」）が提供するe-Learningサービス（以下「本サービス」）の利用に関する条件を定めるものです。
                ユーザーは本規約に同意の上、本サービスを利用するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第2条（利用登録）</h2>
              <p className="text-muted-foreground">
                本サービスの利用を希望する者は、当社の定める方法により利用登録を申請し、当社がこれを承認することで利用登録が完了します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
              <p className="text-muted-foreground">
                ユーザーは、自己の責任においてユーザーIDおよびパスワードを管理するものとします。
                ユーザーIDおよびパスワードの管理不十分、使用上の過誤等による損害の責任はユーザーが負うものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第4条（禁止事項）</h2>
              <p className="text-muted-foreground">
                ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>当社のサービスの運営を妨害するおそれのある行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第5条（本サービスの提供の停止等）</h2>
              <p className="text-muted-foreground">
                当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第6条（著作権）</h2>
              <p className="text-muted-foreground">
                本サービスにおいて提供されるコンテンツの著作権は、当社または当該コンテンツの提供者に帰属します。
                ユーザーは、私的利用の範囲を超えて、コンテンツを複製、改変、頒布等することはできません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第7条（免責事項）</h2>
              <p className="text-muted-foreground">
                当社は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。
                当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">第8条（準拠法・裁判管轄）</h2>
              <p className="text-muted-foreground">
                本規約の解釈にあたっては、日本法を準拠法とします。
                本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
              </p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">
              制定日：2026年1月1日<br />
              最終更新日：2026年1月14日
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
