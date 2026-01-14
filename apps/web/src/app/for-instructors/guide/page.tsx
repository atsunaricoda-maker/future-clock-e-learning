import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Video, 
  FileText, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';

export default function InstructorGuidePage() {
  const guides = [
    {
      icon: BookOpen,
      title: 'コース設計ガイド',
      description: '効果的なカリキュラムの作り方、学習目標の設定方法を解説します。',
      link: '#',
    },
    {
      icon: Video,
      title: '動画制作ガイド',
      description: '高品質な講義動画を撮影・編集するためのノウハウをお伝えします。',
      link: '#',
    },
    {
      icon: FileText,
      title: '教材作成ガイド',
      description: '補助教材、クイズ、課題の効果的な作成方法を学べます。',
      link: '#',
    },
    {
      icon: MessageSquare,
      title: 'コミュニケーションガイド',
      description: '受講者との効果的なコミュニケーション方法を紹介します。',
      link: '#',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="py-20">
          <div className="container max-w-4xl">
            <h1 className="text-4xl font-bold text-center">講師ガイド</h1>
            <p className="text-center text-muted-foreground mt-4">
              質の高いコースを作成するためのリソース集
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {guides.map((guide, index) => {
                const Icon = guide.icon;
                return (
                  <div key={index} className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{guide.title}</h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {guide.description}
                        </p>
                        <Button variant="link" className="px-0 mt-2 gap-1">
                          詳しく見る
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 rounded-xl bg-muted/50 p-8 text-center">
              <h2 className="text-2xl font-bold">サポートが必要ですか？</h2>
              <p className="text-muted-foreground mt-2">
                講師専用のサポートチームがお手伝いします
              </p>
              <Link href="/instructor/support">
                <Button className="mt-4">
                  サポートに連絡
                </Button>
              </Link>
            </div>
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
