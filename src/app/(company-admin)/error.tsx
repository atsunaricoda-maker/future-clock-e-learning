"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CompanyAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold">エラーが発生しました</h2>
        <p className="mt-2 text-muted-foreground">
          企業管理画面でエラーが発生しました。再試行するか、企業ダッシュボードに戻ってください。
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            再試行
          </button>
          <Link
            href="/company"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            企業ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  );
}
