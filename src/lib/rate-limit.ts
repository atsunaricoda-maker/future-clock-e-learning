/**
 * インメモリ Rate Limiter
 *
 * シンプルな sliding-window 方式。
 * サーバーレス環境（Vercel）では各インスタンスごとに独立するため、
 * 完全な分散制限にはならないが、単一インスタンスへの連続攻撃を防ぐ。
 * 本格運用では @upstash/ratelimit + Redis の導入を推奨。
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL = 60_000; // 60秒
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

type RateLimitConfig = {
  /** リクエスト上限 */
  limit: number;
  /** ウィンドウ（ミリ秒） */
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Rate Limit チェック
 * @param key ユーザー識別キー (IPアドレス や userId)
 * @param config limit + windowMs
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // 新規 or ウィンドウ期限切れ → リセット
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  // ウィンドウ内
  entry.count += 1;

  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

// プリセット設定
export const RATE_LIMITS = {
  /** API 一般: 60回/分 */
  api: { limit: 60, windowMs: 60_000 },
  /** ログイン/認証: 10回/分 */
  auth: { limit: 10, windowMs: 60_000 },
  /** Stripe checkout: 5回/分 */
  checkout: { limit: 5, windowMs: 60_000 },
  /** heartbeat: 30回/分 */
  heartbeat: { limit: 30, windowMs: 60_000 },
} as const;
