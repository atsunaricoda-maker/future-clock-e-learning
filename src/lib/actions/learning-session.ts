"use server";

import { createClient } from "@/lib/supabase/server";

type LogoutReason = "manual" | "browser_close" | "inactivity" | "session_expired";

// ログイン時にセッションを作成。既存のアクティブセッションは自動終了
export async function startSession(
  ipAddress?: string,
  userAgent?: string
): Promise<{ sessionId: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sessionId: null, error: "認証が必要です" };

  // 既存のアクティブセッションを終了
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
          logout_reason: "session_expired" as LogoutReason,
          duration_minutes: durationMin,
          is_active: false,
        })
        .eq("id", session.id);
    }
  }

  // 新規セッション作成
  const { data: session, error } = await supabase
    .from("learning_sessions")
    .insert({
      user_id: user.id,
      login_at: new Date().toISOString(),
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("startSession error:", error);
    return { sessionId: null, error: "セッションの開始に失敗しました" };
  }

  // users.last_login_at を更新
  await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return { sessionId: session.id, error: null };
}

// セッションIDを指定して終了
export async function endSession(
  sessionId: string,
  reason: LogoutReason
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // セッション取得
  const { data: session } = await supabase
    .from("learning_sessions")
    .select("id, login_at, is_active")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return { error: "セッションが見つかりません" };
  if (!session.is_active) return { error: null }; // 既に終了済み

  const now = new Date();
  const loginAt = new Date(session.login_at);
  const durationMin = Math.round(
    (now.getTime() - loginAt.getTime()) / 60000
  );

  const { error } = await supabase
    .from("learning_sessions")
    .update({
      logout_at: now.toISOString(),
      logout_reason: reason,
      duration_minutes: durationMin,
      is_active: false,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("endSession error:", error);
    return { error: "セッションの終了に失敗しました" };
  }

  return { error: null };
}

// 現ユーザーのアクティブセッションを全て終了（明示ログアウト用）
export async function endActiveSession(
  reason: LogoutReason
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: activeSessions } = await supabase
    .from("learning_sessions")
    .select("id, login_at")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!activeSessions || activeSessions.length === 0) {
    return { error: null };
  }

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
        logout_reason: reason,
        duration_minutes: durationMin,
        is_active: false,
      })
      .eq("id", session.id);
  }

  return { error: null };
}

// ハートビート記録
export async function recordHeartbeat(
  sessionId: string,
  activityType: string = "heartbeat",
  metadata?: Record<string, unknown>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("learning_activity_logs").insert({
    session_id: sessionId,
    user_id: user.id,
    activity_at: new Date().toISOString(),
    activity_type: activityType,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error("recordHeartbeat error:", error);
    return { error: "アクティビティの記録に失敗しました" };
  }

  return { error: null };
}

// アクティブセッション取得
export async function getActiveSession(): Promise<{
  sessionId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sessionId: null, error: "認証が必要です" };

  const { data: session } = await supabase
    .from("learning_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("login_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { sessionId: session?.id ?? null, error: null };
}

// 学習セッション一覧取得（管理画面用）
export async function getLearningSessionsForAdmin(filters: {
  dateFrom?: string;
  dateTo?: string;
  userName?: string;
  logoutReason?: string;
  companyId?: string;
  page?: number;
}): Promise<{
  sessions: {
    id: string;
    user_name: string;
    user_email: string;
    login_at: string;
    logout_at: string | null;
    duration_minutes: number | null;
    logout_reason: string | null;
    is_active: boolean;
    activity_count: number;
  }[];
  total: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { sessions: [], total: 0, error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "company_admin")) {
    return { sessions: [], total: 0, error: "権限がありません" };
  }

  const pageSize = 20;
  const page = filters.page ?? 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // ユーザーIDフィルタ用（企業管理者の場合は自社メンバーのみ）
  let userIds: string[] | null = null;
  const companyId = filters.companyId ?? (profile.role === "company_admin" ? profile.company_id : null);

  if (companyId || filters.userName) {
    let userQuery = supabase.from("users").select("id, full_name, email");
    if (companyId) {
      userQuery = userQuery.eq("company_id", companyId);
    }
    if (filters.userName) {
      userQuery = userQuery.or(
        `full_name.ilike.%${filters.userName}%,email.ilike.%${filters.userName}%`
      );
    }
    const { data: filteredUsers } = await userQuery;
    userIds = (filteredUsers ?? []).map((u) => u.id);
    if (userIds.length === 0) {
      return { sessions: [], total: 0, error: null };
    }
  }

  // セッションクエリ
  let query = supabase
    .from("learning_sessions")
    .select(
      "id, user_id, login_at, logout_at, duration_minutes, logout_reason, is_active, users(full_name, email)",
      { count: "exact" }
    );

  if (userIds) {
    query = query.in("user_id", userIds);
  }
  if (filters.dateFrom) {
    query = query.gte("login_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters.dateTo) {
    query = query.lte("login_at", `${filters.dateTo}T23:59:59`);
  }
  if (filters.logoutReason) {
    query = query.eq("logout_reason", filters.logoutReason);
  }

  query = query.order("login_at", { ascending: false }).range(from, to);

  const { data: sessionsRaw, count, error } = await query;

  if (error) {
    console.error("getLearningSessionsForAdmin error:", error);
    return { sessions: [], total: 0, error: "データの取得に失敗しました" };
  }

  type SessionRow = {
    id: string;
    user_id: string;
    login_at: string;
    logout_at: string | null;
    duration_minutes: number | null;
    logout_reason: string | null;
    is_active: boolean;
    users: { full_name: string; email: string } | null;
  };

  const typedSessions = (sessionsRaw ?? []) as unknown as SessionRow[];
  const sessionIds = typedSessions.map((s) => s.id);

  // アクティビティカウント取得
  let activityCounts = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: activities } = await supabase
      .from("learning_activity_logs")
      .select("session_id")
      .in("session_id", sessionIds);

    if (activities) {
      for (const a of activities) {
        activityCounts.set(
          a.session_id,
          (activityCounts.get(a.session_id) ?? 0) + 1
        );
      }
    }
  }

  const sessions = (sessionsRaw as unknown as SessionRow[]).map((s) => ({
    id: s.id,
    user_name: s.users?.full_name ?? "",
    user_email: s.users?.email ?? "",
    login_at: s.login_at,
    logout_at: s.logout_at,
    duration_minutes: s.duration_minutes,
    logout_reason: s.logout_reason,
    is_active: s.is_active,
    activity_count: activityCounts.get(s.id) ?? 0,
  }));

  return { sessions, total: count ?? 0, error: null };
}

// 本日の学習時間（受講生ダッシュボード用）
export async function getTodayLearningMinutes(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("login_at, logout_at, duration_minutes, is_active")
    .eq("user_id", user.id)
    .gte("login_at", today.toISOString());

  if (!sessions) return 0;

  let totalMinutes = 0;
  const now = new Date();

  for (const s of sessions) {
    if (s.duration_minutes != null) {
      totalMinutes += s.duration_minutes;
    } else if (s.is_active) {
      // アクティブセッションは現在時刻までの経過時間を計算
      const loginAt = new Date(s.login_at);
      totalMinutes += Math.round((now.getTime() - loginAt.getTime()) / 60000);
    }
  }

  return totalMinutes;
}
