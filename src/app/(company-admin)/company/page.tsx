import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { getActiveAnnouncements } from "@/lib/actions/announcement";
import { formatRelativeTime } from "@/lib/format";
import {
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  UserPlus,
  Award,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default async function CompanyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get company_admin's company_id
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">企業ダッシュボード</h1>
          <p className="text-muted-foreground">
            所属企業が設定されていません。管理者にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  const companyId = profile.company_id;

  // Parallel data fetching
  const [
    membersRes,
    allMembersRes,
    companyCoursesRes,
    memberEnrollmentsRes,
    recentEnrollmentsRes,
    recentCompletionsRes,
    certificatesRes,
  ] = await Promise.all([
    // Company members count
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    // All active members with last login
    supabase
      .from("users")
      .select("id, full_name, email, last_sign_in_at")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("last_sign_in_at", { ascending: true, nullsFirst: true }),
    // Company courses count
    supabase
      .from("company_courses")
      .select("id, course_id, courses(id, title)")
      .eq("company_id", companyId),
    // Member enrollments for progress stats
    supabase
      .from("enrollments")
      .select("id, course_id, progress_percentage, completed_at, users!inner(company_id)")
      .eq("users.company_id", companyId),
    // Recent enrollments by company members
    supabase
      .from("enrollments")
      .select("id, enrolled_at, users!inner(full_name, company_id), courses(title)")
      .eq("users.company_id", companyId)
      .order("enrolled_at", { ascending: false })
      .limit(5),
    // Recent lesson completions by company members
    supabase
      .from("lesson_progress")
      .select("id, completed_at, users!inner(full_name, company_id), lessons(title)")
      .eq("users.company_id", companyId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    // Certificates earned by company members
    supabase
      .from("certificates")
      .select("id, issued_at, users!inner(full_name, company_id), courses(title)")
      .eq("users.company_id", companyId)
      .order("issued_at", { ascending: false }),
  ]);

  const totalMembers = membersRes.count ?? 0;
  const allMembers = allMembersRes.data ?? [];
  const totalCompanyCourses = companyCoursesRes.data?.length ?? 0;

  const memberEnrollments = memberEnrollmentsRes.data ?? [];
  const avgProgress =
    memberEnrollments.length > 0
      ? Math.round(
          memberEnrollments.reduce(
            (sum, e) => sum + Number(e.progress_percentage),
            0
          ) / memberEnrollments.length
        )
      : 0;
  const completedCount = memberEnrollments.filter(
    (e) => e.completed_at
  ).length;

  const totalCertificates = certificatesRes.data?.length ?? 0;

  // Inactive members (no login in 7+ days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const inactiveMembers = allMembers.filter((m) => {
    if (!m.last_sign_in_at) return true;
    return new Date(m.last_sign_in_at) < sevenDaysAgo;
  });

  // Course-level progress overview
  type CompanyCourseItem = {
    id: string;
    course_id: string;
    courses: { id: string; title: string } | null;
  };
  const companyCourseItems = (companyCoursesRes.data ?? []) as unknown as CompanyCourseItem[];
  const courseProgressOverview = companyCourseItems
    .filter((cc) => cc.courses)
    .map((cc) => {
      const courseEnrollments = memberEnrollments.filter(
        (e) => e.course_id === cc.courses!.id
      );
      const total = courseEnrollments.length;
      const completed = courseEnrollments.filter((e) => e.completed_at).length;
      const avg =
        total > 0
          ? Math.round(
              courseEnrollments.reduce(
                (sum, e) => sum + Number(e.progress_percentage),
                0
              ) / total
            )
          : 0;
      return {
        id: cc.courses!.id,
        title: cc.courses!.title,
        enrolledCount: total,
        completedCount: completed,
        avgProgress: avg,
      };
    })
    .sort((a, b) => b.enrolledCount - a.enrolledCount);

  // Merge recent activities
  type ActivityItem = {
    type: "enrollment" | "completion";
    userName: string;
    targetTitle: string;
    timestamp: string;
  };

  const activities: ActivityItem[] = [];

  for (const e of recentEnrollmentsRes.data ?? []) {
    const u = e.users as unknown as { full_name: string } | null;
    const c = e.courses as unknown as { title: string } | null;
    if (u && c && e.enrolled_at) {
      activities.push({
        type: "enrollment",
        userName: u.full_name || "不明",
        targetTitle: c.title,
        timestamp: e.enrolled_at,
      });
    }
  }

  for (const p of recentCompletionsRes.data ?? []) {
    const u = p.users as unknown as { full_name: string } | null;
    const l = p.lessons as unknown as { title: string } | null;
    if (u && l && p.completed_at) {
      activities.push({
        type: "completion",
        userName: u.full_name || "不明",
        targetTitle: l.title,
        timestamp: p.completed_at,
      });
    }
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const recentActivities = activities.slice(0, 8);

  // Fetch announcements for company admin
  const announcements = await getActiveAnnouncements({
    role: "company_admin",
    companyId: companyId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">企業ダッシュボード</h1>
        <p className="text-muted-foreground">
          自社の受講状況を確認できます
        </p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="社員数"
          value={totalMembers}
          subtitle="アクティブ社員"
          icon={Users}
        />
        <StatCard
          title="受講可能コース"
          value={totalCompanyCourses}
          subtitle="コース"
          icon={BookOpen}
        />
        <StatCard
          title="平均進捗率"
          value={memberEnrollments.length > 0 ? `${avgProgress}%` : "-"}
          subtitle={memberEnrollments.length > 0 ? "全受講の平均" : "データなし"}
          icon={TrendingUp}
        />
        <StatCard
          title="修了証"
          value={totalCertificates}
          subtitle="発行済み"
          icon={Award}
        />
      </div>

      {/* Inactive members alert */}
      {inactiveMembers.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm">
                <span className="font-medium">{inactiveMembers.length}名</span>
                の社員が7日以上ログインしていません
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/company/members">
                確認する
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Course Progress Overview */}
      {courseProgressOverview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">コース別進捗</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/company/courses">
                  詳細
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseProgressOverview.slice(0, 5).map((course) => (
                <div key={course.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1 mr-4">
                      {course.title}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                      <span>{course.enrolledCount}名受講</span>
                      <Badge
                        variant={course.completedCount > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {course.completedCount}名修了
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={course.avgProgress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {course.avgProgress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>最近のアクティビティ</CardTitle>
          {recentActivities.length === 0 && (
            <CardDescription>
              まだアクティビティがありません
            </CardDescription>
          )}
        </CardHeader>
        {recentActivities.length > 0 && (
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded-full bg-muted p-1.5">
                    {activity.type === "enrollment" ? (
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.userName}</span>
                      {" が「"}
                      <span className="font-medium">
                        {activity.targetTitle}
                      </span>
                      {activity.type === "enrollment"
                        ? "」に登録しました"
                        : "」を完了しました"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
