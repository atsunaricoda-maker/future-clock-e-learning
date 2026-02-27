"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LearningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold">エラーが発生しました</h2>
        <p className="mt-2 text-muted-foreground">
          学習画面でエラーが発生しました。再試行するか、ダッシュボードに戻ってください。
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            再試行
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  );
}
