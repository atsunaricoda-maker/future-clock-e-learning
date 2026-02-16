import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { DailyActivityChart, MonthlyEnrollmentChart } from "@/components/admin/analytics-charts";
import { formatRelativeTime } from "@/lib/format";
import {
  BookOpen,
  Users,
  Building2,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Plus,
  AlertTriangle,
  Star,
  Award,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    coursesRes,
    usersRes,
    companiesRes,
    enrollmentStatsRes,
    recentEnrollmentsRes,
    recentCompletionsRes,
    popularCoursesRes,
    allEnrollmentsForChartRes,
    recentCompletionsForChartRes,
    certificatesRes,
    recentReviewsRes,
    draftCoursesRes,
  ] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("enrollments").select("progress_percentage"),
    supabase
      .from("enrollments")
      .select("id, enrolled_at, users(full_name), courses(title)")
      .order("enrolled_at", { ascending: false })
      .limit(5),
    supabase
      .from("lesson_progress")
      .select("id, completed_at, users(full_name), lessons(title)")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("courses")
      .select("id, title, enrollments(count)")
      .eq("status", "published"),
    supabase
      .from("enrollments")
      .select("enrolled_at")
      .gte("enrolled_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    // Additional queries for enhanced dashboard
    supabase
      .from("certificates")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, users(full_name), courses(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("courses")
      .select("id, title, status")
      .eq("status", "draft"),
  ]);

  const totalCourses = coursesRes.count ?? 0;
  const totalUsers = usersRes.count ?? 0;
  const totalCompanies = companiesRes.count ?? 0;

  const enrollmentStats = enrollmentStatsRes.data ?? [];
  const avgCompletion =
    enrollmentStats.length > 0
      ? Math.round(
          enrollmentStats.reduce(
            (sum, e) => sum + Number(e.progress_percentage),
            0
          ) / enrollmentStats.length
        )
      : null;

  // Merge recent enrollments and completions into a unified activity feed
  type ActivityItem = {
    type: "enrollment" | "completion";
    userName: string;
    targetTitle: string;
    timestamp: string;
  };

  const activities: ActivityItem[] = [];

  for (const e of recentEnrollmentsRes.data ?? []) {
    const user = e.users as unknown as { full_name: string } | null;
    const course = e.courses as unknown as { title: string } | null;
    if (user && course && e.enrolled_at) {
      activities.push({
        type: "enrollment",
        userName: user.full_name || "不明",
        targetTitle: course.title,
        timestamp: e.enrolled_at,
      });
    }
  }

  for (const p of recentCompletionsRes.data ?? []) {
    const user = p.users as unknown as { full_name: string } | null;
    const lesson = p.lessons as unknown as { title: string } | null;
    if (user && lesson && p.completed_at) {
      activities.push({
        type: "completion",
        userName: user.full_name || "不明",
        targetTitle: lesson.title,
        timestamp: p.completed_at,
      });
    }
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const recentActivities = activities.slice(0, 8);

  // Popular courses by enrollment count
  type PopularCourse = { id: string; title: string; enrollmentCount: number };
  const popularCourses: PopularCourse[] = (popularCoursesRes.data ?? [])
    .map((c) => {
      const enrollments = c.enrollments as unknown as { count: number }[];
      return {
        id: c.id,
        title: c.title,
        enrollmentCount: enrollments?.[0]?.count ?? 0,
      };
    })
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
    .slice(0, 5);

  // Daily activity chart data (last 30 days)
  const allEnrollmentsForChart = allEnrollmentsForChartRes.data ?? [];
  const recentCompletionsForChart = recentCompletionsForChartRes.data ?? [];

  const dailyData: { date: string; enrollments: number; completions: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const enrollCount = allEnrollmentsForChart.filter((e) => {
      const t = new Date(e.enrolled_at);
      return t >= dayStart && t < dayEnd;
    }).length;

    const completionCount = recentCompletionsForChart.filter((c) => {
      const t = new Date(c.completed_at!);
      return t >= dayStart && t < dayEnd;
    }).length;

    dailyData.push({ date: dateStr, enrollments: enrollCount, completions: completionCount });
  }

  // Monthly enrollment trend (last 6 months)
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const count = allEnrollmentsForChart.filter((e) => {
      const enrolled = new Date(e.enrolled_at);
      return enrolled.getFullYear() === year && enrolled.getMonth() === month;
    }).length;
    monthlyData.push({
      month: `${year}/${String(month + 1).padStart(2, "0")}`,
      count,
    });
  }

  // Certificates count
  const totalCertificates = certificatesRes.count ?? 0;

  // Recent reviews
  type ReviewRow = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    users: { full_name: string } | null;
    courses: { title: string } | null;
  };
  const recentReviews = ((recentReviewsRes.data ?? []) as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    userName: r.users?.full_name ?? "不明",
    courseTitle: r.courses?.title ?? "不明",
  }));

  // Draft courses (alerts)
  const draftCourses = draftCoursesRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
          <p className="text-muted-foreground">
            プラットフォームの概要を確認できます
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/admin/courses/new">
              <Plus className="mr-1 h-4 w-4" />
              コース作成
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users/new">
              <UserPlus className="mr-1 h-4 w-4" />
              ユーザー作成
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="総コース数"
          value={totalCourses}
          subtitle="コース"
          icon={BookOpen}
        />
        <StatCard
          title="総ユーザー数"
          value={totalUsers}
          subtitle="ユーザー"
          icon={Users}
        />
        <StatCard
          title="登録企業数"
          value={totalCompanies}
          subtitle="企業"
          icon={Building2}
        />
        <StatCard
          title="修了証発行数"
          value={totalCertificates}
          subtitle="修了証"
          icon={Award}
        />
      </div>

      {/* Alerts */}
      {draftCourses.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm">
              <span className="font-medium">{draftCourses.length}件</span>
              の下書きコースがあります。
              <Link href="/admin/courses?status=draft" className="ml-1 text-primary underline-offset-4 hover:underline">
                確認する
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DailyActivityChart data={dailyData} />
        <MonthlyEnrollmentChart data={monthlyData} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            {recentActivities.length === 0 && (
              <CardDescription>
                まだアクティビティがありません。コースを作成して学習を開始しましょう。
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
                        {activity.type === "enrollment"
                          ? " が「"
                          : " が「"}
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

        {/* Popular Courses Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>人気コースランキング</CardTitle>
            {popularCourses.length === 0 && (
              <CardDescription>
                まだ公開中のコースがありません
              </CardDescription>
            )}
          </CardHeader>
          {popularCourses.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {popularCourses.map((course, i) => (
                  <Link
                    key={course.id}
                    href={`/admin/courses/${course.id}`}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {course.title}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {course.enrollmentCount}名
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              最近のレビュー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <div key={review.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-0.5 pt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{review.userName}</span>
                      <span className="text-muted-foreground"> ー </span>
                      <span className="text-muted-foreground">{review.courseTitle}</span>
                    </p>
                    {review.comment && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(review.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
