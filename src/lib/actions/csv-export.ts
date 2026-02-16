"use server";

import { createClient } from "@/lib/supabase/server";

function toCsvRow(values: (string | number | null)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "";
      const str = String(v);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

export async function exportUsersCsv(): Promise<{ csv: string; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: "", error: "認証が必要です" };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { csv: "", error: "管理者権限が必要です" };

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role, company_id, is_active, created_at, companies(name)")
    .order("created_at", { ascending: false });

  if (!users) return { csv: "", error: "データの取得に失敗しました" };

  type UserRow = {
    id: string; email: string; full_name: string; role: string;
    company_id: string | null; is_active: boolean; created_at: string;
    companies: { name: string } | null;
  };

  const header = "ID,メール,氏名,ロール,企業名,ステータス,作成日";
  const rows = (users as unknown as UserRow[]).map((u) =>
    toCsvRow([u.id, u.email, u.full_name, u.role, u.companies?.name ?? "", u.is_active ? "有効" : "無効", u.created_at.slice(0, 10)])
  );

  return { csv: "\uFEFF" + header + "\n" + rows.join("\n"), error: null };
}

export async function exportEnrollmentsCsv(): Promise<{ csv: string; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: "", error: "認証が必要です" };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { csv: "", error: "管理者権限が必要です" };

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, completed_at, progress_percentage, users(email, full_name), courses(title)")
    .order("enrolled_at", { ascending: false });

  if (!enrollments) return { csv: "", error: "データの取得に失敗しました" };

  type EnrollmentRow = {
    id: string; enrolled_at: string; completed_at: string | null; progress_percentage: number;
    users: { email: string; full_name: string } | null;
    courses: { title: string } | null;
  };

  const header = "ID,ユーザー名,メール,コース名,進捗率,登録日,修了日";
  const rows = (enrollments as unknown as EnrollmentRow[]).map((e) =>
    toCsvRow([
      e.id,
      e.users?.full_name ?? "",
      e.users?.email ?? "",
      e.courses?.title ?? "",
      e.progress_percentage,
      e.enrolled_at.slice(0, 10),
      e.completed_at?.slice(0, 10) ?? "",
    ])
  );

  return { csv: "\uFEFF" + header + "\n" + rows.join("\n"), error: null };
}

export async function exportCompanyReportCsv(): Promise<{ csv: string; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: "", error: "認証が必要です" };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { csv: "", error: "管理者権限が必要です" };

  const [companiesRes, usersRes, enrollmentsRes] = await Promise.all([
    supabase.from("companies").select("id, name, plan_type, max_users, is_active").order("name"),
    supabase.from("users").select("id, company_id"),
    supabase.from("enrollments").select("user_id, completed_at, progress_percentage"),
  ]);

  const companies = companiesRes.data ?? [];
  const allUsers = usersRes.data ?? [];
  const allEnrollments = enrollmentsRes.data ?? [];

  const header = "企業名,プラン,ユーザー数,上限,ステータス,総受講数,修了数,平均進捗";
  const rows = companies.map((c) => {
    const companyUsers = allUsers.filter((u) => u.company_id === c.id);
    const userIds = new Set(companyUsers.map((u) => u.id));
    const companyEnrollments = allEnrollments.filter((e) => userIds.has(e.user_id));
    const completedCount = companyEnrollments.filter((e) => e.completed_at).length;
    const avgProgress = companyEnrollments.length > 0
      ? Math.round(companyEnrollments.reduce((s, e) => s + Number(e.progress_percentage), 0) / companyEnrollments.length)
      : 0;

    return toCsvRow([
      c.name,
      c.plan_type,
      companyUsers.length,
      c.max_users,
      c.is_active ? "有効" : "無効",
      companyEnrollments.length,
      completedCount,
      `${avgProgress}%`,
    ]);
  });

  return { csv: "\uFEFF" + header + "\n" + rows.join("\n"), error: null };
}

// ============================================
// 学習ログCSV出力（出勤簿突合用）
// ============================================

const logoutReasonLabelMap: Record<string, string> = {
  manual: "手動ログアウト",
  browser_close: "ブラウザ閉じ",
  inactivity: "非活動",
  session_expired: "セッション期限切れ",
};

function formatJSTTimeForCsv(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  });
}

function formatJSTDateForCsv(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).replace(/\//g, "-");
}

// 学習ログ詳細CSV（出勤簿突合用）
export async function exportLearningLogsCsv(
  dateFrom?: string,
  dateTo?: string,
  companyId?: string
): Promise<{ csv: string; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: "", error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "company_admin")) {
    return { csv: "", error: "権限がありません" };
  }

  const effectiveCompanyId = companyId ?? (profile.role === "company_admin" ? profile.company_id : null);

  let query = supabase
    .from("learning_sessions")
    .select("login_at, logout_at, duration_minutes, logout_reason, users(full_name, email, company_id)")
    .order("login_at", { ascending: true });

  if (dateFrom) query = query.gte("login_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("login_at", `${dateTo}T23:59:59`);

  const { data: sessions } = await query;
  if (!sessions) return { csv: "", error: "データの取得に失敗しました" };

  type SessionRow = {
    login_at: string;
    logout_at: string | null;
    duration_minutes: number | null;
    logout_reason: string | null;
    users: { full_name: string; email: string; company_id: string | null } | null;
  };

  const filteredSessions = (sessions as unknown as SessionRow[]).filter((s) => {
    if (!effectiveCompanyId) return true;
    return s.users?.company_id === effectiveCompanyId;
  });

  const header = "氏名,メール,日付,ログイン時刻,ログアウト時刻,学習時間(分),ログアウト理由";
  const rows = filteredSessions.map((s) =>
    toCsvRow([
      s.users?.full_name ?? "",
      s.users?.email ?? "",
      formatJSTDateForCsv(s.login_at),
      formatJSTTimeForCsv(s.login_at),
      s.logout_at ? formatJSTTimeForCsv(s.logout_at) : "",
      s.duration_minutes ?? "",
      s.logout_reason ? (logoutReasonLabelMap[s.logout_reason] ?? s.logout_reason) : "",
    ])
  );

  return { csv: "\uFEFF" + header + "\n" + rows.join("\n"), error: null };
}

// 日別学習集計CSV
export async function exportDailyLearningSummaryCsv(
  dateFrom?: string,
  dateTo?: string,
  companyId?: string
): Promise<{ csv: string; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: "", error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "company_admin")) {
    return { csv: "", error: "権限がありません" };
  }

  const effectiveCompanyId = companyId ?? (profile.role === "company_admin" ? profile.company_id : null);

  let query = supabase
    .from("learning_sessions")
    .select("user_id, login_at, logout_at, duration_minutes, users(full_name, email, company_id)")
    .not("logout_at", "is", null)
    .order("login_at", { ascending: true });

  if (dateFrom) query = query.gte("login_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("login_at", `${dateTo}T23:59:59`);

  const { data: sessions } = await query;
  if (!sessions) return { csv: "", error: "データの取得に失敗しました" };

  type SessionRow = {
    user_id: string;
    login_at: string;
    logout_at: string | null;
    duration_minutes: number | null;
    users: { full_name: string; email: string; company_id: string | null } | null;
  };

  const filteredSessions = (sessions as unknown as SessionRow[]).filter((s) => {
    if (!effectiveCompanyId) return true;
    return s.users?.company_id === effectiveCompanyId;
  });

  // ユーザー × 日付 でグループ化
  const dailyMap = new Map<
    string,
    {
      full_name: string;
      email: string;
      date: string;
      firstLogin: string;
      lastLogout: string;
      totalMinutes: number;
      sessionCount: number;
    }
  >();

  for (const s of filteredSessions) {
    if (!s.users || !s.logout_at) continue;
    const dateKey = formatJSTDateForCsv(s.login_at);
    const mapKey = `${s.user_id}_${dateKey}`;

    const existing = dailyMap.get(mapKey);
    if (existing) {
      if (s.login_at < existing.firstLogin) existing.firstLogin = s.login_at;
      if (s.logout_at > existing.lastLogout) existing.lastLogout = s.logout_at;
      existing.totalMinutes += s.duration_minutes ?? 0;
      existing.sessionCount += 1;
    } else {
      dailyMap.set(mapKey, {
        full_name: s.users.full_name,
        email: s.users.email,
        date: dateKey,
        firstLogin: s.login_at,
        lastLogout: s.logout_at,
        totalMinutes: s.duration_minutes ?? 0,
        sessionCount: 1,
      });
    }
  }

  const header = "氏名,メール,日付,初回ログイン,最終ログアウト,総学習時間(分),セッション数";
  const rows = Array.from(dailyMap.values()).map((d) =>
    toCsvRow([
      d.full_name,
      d.email,
      d.date,
      formatJSTTimeForCsv(d.firstLogin),
      formatJSTTimeForCsv(d.lastLogout),
      d.totalMinutes,
      d.sessionCount,
    ])
  );

  return { csv: "\uFEFF" + header + "\n" + rows.join("\n"), error: null };
}
