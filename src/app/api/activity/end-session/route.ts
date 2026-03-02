import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate Limit チェック
    const ip = getClientIp(request);
    const rl = rateLimit(`end-session:${ip}`, RATE_LIMITS.api);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // sendBeacon は text/plain で送るため、両方のContent-Typeに対応
    let body: { sessionId?: string; reason?: string };
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }
    }

    const { sessionId, reason = "browser_close" } = body;

    if (!sessionId) {
      // sessionIdが無い場合、アクティブセッションを全て終了
      const { data: activeSessions } = await supabase
        .from("learning_sessions")
        .select("id, login_at")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (activeSessions && activeSessions.length > 0) {
        const now = new Date();
        for (const session of activeSessions) {
          const loginAt = new Date(session.login_at);
          const durationMin = Math.round(
            (now.getTime() - loginAt.getTime()) / 60000
          );
          await supabase
            .from("learning_sessions")
            .update({
              logout_at: now.toISOString(),
              logout_reason: reason as "manual" | "browser_close" | "inactivity" | "session_expired",
              duration_minutes: durationMin,
              is_active: false,
            })
            .eq("id", session.id);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // 指定セッションを終了
    const { data: session } = await supabase
      .from("learning_sessions")
      .select("id, login_at, is_active")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session || !session.is_active) {
      return NextResponse.json({ ok: true }); // 既に終了済み
    }

    const now = new Date();
    const loginAt = new Date(session.login_at);
    const durationMin = Math.round(
      (now.getTime() - loginAt.getTime()) / 60000
    );

    await supabase
      .from("learning_sessions")
      .update({
        logout_at: now.toISOString(),
        logout_reason: reason as "manual" | "browser_close" | "inactivity" | "session_expired",
        duration_minutes: durationMin,
        is_active: false,
      })
      .eq("id", sessionId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("End session route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
