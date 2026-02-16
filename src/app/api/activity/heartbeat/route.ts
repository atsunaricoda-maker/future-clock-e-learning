import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // sendBeacon は text/plain で送るため、両方のContent-Typeに対応
    let body: { sessionId?: string; activityType?: string; metadata?: Record<string, unknown> };
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      // text/plain (sendBeacon fallback)
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }
    }

    const { sessionId, activityType = "heartbeat", metadata } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    // セッションがアクティブか確認
    const { data: session } = await supabase
      .from("learning_sessions")
      .select("id, is_active")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.is_active) {
      return NextResponse.json({ error: "Session expired" }, { status: 409 });
    }

    // アクティビティログ記録
    const { error } = await supabase.from("learning_activity_logs").insert({
      session_id: sessionId,
      user_id: user.id,
      activity_at: new Date().toISOString(),
      activity_type: activityType,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error("Heartbeat insert error:", error);
      return NextResponse.json({ error: "Failed to record" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Heartbeat route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
