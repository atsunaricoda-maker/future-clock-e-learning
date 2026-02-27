"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold">エラーが発生しました</h2>
        <p className="mt-2 text-muted-foreground">
          管理画面でエラーが発生しました。再試行するか、管理ダッシュボードに戻ってください。
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            再試行
          </button>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            管理ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  );
}
