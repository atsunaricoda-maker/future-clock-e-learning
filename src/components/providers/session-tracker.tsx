"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startSession, getActiveSession } from "@/lib/actions/learning-session";

const HEARTBEAT_INTERVAL = 60_000; // 60秒
const HEARTBEAT_BACKGROUND_INTERVAL = 300_000; // タブ非表示時5分
const IDLE_TIMEOUT = 30 * 60_000; // 30分
const IDLE_WARNING_COUNTDOWN = 5 * 60_000; // 5分カウントダウン

interface SessionTrackerProps {
  userId: string;
  children: React.ReactNode;
}

export function SessionTracker({ userId, children }: SessionTrackerProps) {
  const router = useRouter();
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(300); // 5分 = 300秒
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  // ハートビート送信
  const sendHeartbeat = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    try {
      const res = await fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });

      if (res.status === 409) {
        // セッション期限切れ → 再ログイン
        sessionIdRef.current = null;
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }
    } catch {
      // ネットワークエラーは無視
    }
  }, [router]);

  // アクティビティ更新
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showIdleWarning) {
      setShowIdleWarning(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setIdleCountdown(300);
    }
  }, [showIdleWarning]);

  // 自動ログアウト
  const performAutoLogout = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      navigator.sendBeacon(
        "/api/activity/end-session",
        JSON.stringify({ sessionId: sid, reason: "inactivity" })
      );
      sessionIdRef.current = null;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  // セッション初期化
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // まず既存のアクティブセッションを確認
      const { sessionId: existingId } = await getActiveSession();
      if (cancelled) return;

      if (existingId) {
        sessionIdRef.current = existingId;
      } else {
        // sessionStorageからログイン時に作成されたIDを取得
        const storedId = sessionStorage.getItem("learning_session_id");
        if (storedId) {
          sessionIdRef.current = storedId;
          sessionStorage.removeItem("learning_session_id");
        } else {
          // 新規セッション作成（ページリロードやSPA遷移時）
          const { sessionId } = await startSession();
          if (cancelled) return;
          if (sessionId) {
            sessionIdRef.current = sessionId;
          }
        }
      }

      // 初回ハートビート
      if (sessionIdRef.current) {
        sendHeartbeat();
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ハートビート定期送信
  useEffect(() => {
    const interval = isVisibleRef.current
      ? HEARTBEAT_INTERVAL
      : HEARTBEAT_BACKGROUND_INTERVAL;

    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, interval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [sendHeartbeat]);

  // アイドル検知
  useEffect(() => {
    idleCheckIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT && !showIdleWarning) {
        setShowIdleWarning(true);
        setIdleCountdown(300);
      }
    }, 10_000); // 10秒ごとにチェック

    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [showIdleWarning]);

  // アイドル警告カウントダウン
  useEffect(() => {
    if (!showIdleWarning) return;

    countdownIntervalRef.current = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          performAutoLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showIdleWarning, performAutoLogout]);

  // アクティビティイベントリスナー
  useEffect(() => {
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    // スロットリング: 5秒に1回だけ処理
    let lastUpdate = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        lastUpdate = now;
        handleActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledHandler);
      });
    };
  }, [handleActivity]);

  // beforeunload: ブラウザ閉じ/リロード時
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current;
      if (sid) {
        navigator.sendBeacon(
          "/api/activity/end-session",
          JSON.stringify({ sessionId: sid, reason: "browser_close" })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // visibilitychange: タブ切替時のハートビート頻度変更
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";

      // ハートビート間隔を変更
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      const interval = isVisibleRef.current
        ? HEARTBEAT_INTERVAL
        : HEARTBEAT_BACKGROUND_INTERVAL;

      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
      }, interval);

      // タブ復帰時に即座にハートビート
      if (isVisibleRef.current) {
        sendHeartbeat();
        handleActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendHeartbeat, handleActivity]);

  const formatCountdown = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {children}

      {/* アイドル警告ダイアログ */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              非活動状態が検出されました
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              30分間操作がありません。
              <span className="font-bold text-destructive">
                {formatCountdown(idleCountdown)}
              </span>
              以内に操作しない場合、自動的にログアウトされます。
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              学習ログは現在の時刻で記録されます。
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleActivity}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                操作を続ける
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
