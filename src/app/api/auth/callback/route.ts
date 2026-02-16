import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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
