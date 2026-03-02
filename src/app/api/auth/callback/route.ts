import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * next パラメータの安全性チェック（オープンリダイレクト防止）
 * 相対パスのみ許可し、外部URLやプロトコル相対URLを拒否する
 */
function sanitizeRedirectPath(next: string | null): string | null {
  if (!next) return null;
  // 相対パス（/で始まる）のみ許可。// や http:// 等は拒否
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  // バックスラッシュも拒否（ブラウザによっては //と解釈される）
  if (next.includes("\\")) return null;
  // URL-encoded文字でのバイパスを防ぐため、デコードしてもチェック
  try {
    const decoded = decodeURIComponent(next);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
      return null;
    }
  } catch {
    return null;
  }
  return next;
}

export async function GET(request: Request) {
  // Rate Limit チェック
  const ip = getClientIp(request);
  const rl = rateLimit(`auth-callback:${ip}`, RATE_LIMITS.auth);
  if (!rl.success) {
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/login?error=rate_limit`);
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let redirectPath = next ?? "/dashboard";

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 学習セッション開始（OAuth経由）
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
        const userAgent = request.headers.get("user-agent") ?? null;

        // 既存アクティブセッション終了
        await supabase
          .from("learning_sessions")
          .update({
            logout_at: new Date().toISOString(),
            logout_reason: "session_expired",
            is_active: false,
          })
          .eq("user_id", user.id)
          .eq("is_active", true);

        // 新規セッション作成
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          login_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          is_active: true,
        });

        // last_login_at 更新
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);

        if (!next) {
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          if (profile?.role === "admin") {
            redirectPath = "/admin";
          } else if (profile?.role === "company_admin") {
            redirectPath = "/company";
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
