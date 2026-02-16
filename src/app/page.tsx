import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <span className="text-xl font-bold">FutureClock LMS</span>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">ログイン</Button>
          </Link>
          <Link href="/register">
            <Button>新規登録</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          リスキリングで、
          <br />
          未来を切り拓く。
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
          株式会社FutureClockが提供するe-learningプラットフォーム。
          動画教材、クイズ、進捗管理で、効率的にスキルアップを実現します。
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <Button size="lg">無料で始める</Button>
          </Link>
          <Link href="/courses">
            <Button size="lg" variant="outline">
              コース一覧を見る
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} 株式会社FutureClock. All rights
        reserved.
      </footer>
    </div>
  );
}
