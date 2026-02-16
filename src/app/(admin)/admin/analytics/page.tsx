import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  CourseEnrollmentChart,
  CourseCompletionChart,
  DailyActivityChart,
  MonthlyEnrollmentChart,
} from "@/components/admin/analytics-charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ReminderManager } from "@/components/admin/reminder-manager";
import { CsvExportButtons } from "@/components/admin/csv-export-buttons";
import {
  GraduationCap,
  CheckCircle2,
  Target,
  Award,
  Users,
  BookOpen,
} from "lucide-react";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Parallel data fetching
  const [
    enrollmentsRes,
    quizAttemptsRes,
    certificatesRes,
    coursesRes,
    lessonProgressRes,
    recentEnrollmentsRes,
    recentCompletionsRes,
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, user_id, course_id, progress_percentage, completed_at, enrolled_at, users(full_name, email)"
      ),
    supabase.from("quiz_attempts").select("id, passed"),
    supabase.from("certificates").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("id, title, status"),
    supabase
      .from("lesson_progress")
      .select("id, status")
      .eq("status", "completed"),
    supabase
      .from("enrollments")
      .select("enrolled_at")
      .gte(
        "enrolled_at",
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte(
        "completed_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const enrollments = enrollmentsRes.data ?? [];
  const quizAttempts = quizAttemptsRes.data ?? [];
  const totalCertificates = certificatesRes.count ?? 0;
  const courses = coursesRes.data ?? [];
  const completedLessons = lessonProgressRes.data?.length ?? 0;
  const recentEnrollments = recentEnrollmentsRes.data ?? [];
  const recentCompletions = recentCompletionsRes.data ?? [];

  // ─── Summary Stats ───
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter(
    (e) => e.completed_at
  ).length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  const totalAttempts = quizAttempts.length;
  const passedAttempts = quizAttempts.filter((a) => a.passed).length;
  const quizPassRate =
    totalAttempts > 0
      ? Math.round((passedAttempts / totalAttempts) * 100)
      : 0;

  // ─── Daily Activity Chart (last 30 days) ───
  const dailyData: {
    date: string;
    enrollments: number;
    completions: number;
  }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const enrollCount = recentEnrollments.filter((e) => {
      const t = new Date(e.enrolled_at);
      return t >= dayStart && t < dayEnd;
    }).length;

    const completionCount = recentCompletions.filter((c) => {
      const t = new Date(c.completed_at!);
      return t >= dayStart && t < dayEnd;
    }).length;

    dailyData.push({
      date: dateStr,
      enrollments: enrollCount,
      completions: completionCount,
    });
  }

  // ─── Monthly Enrollment Trend (last 6 months) ───
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const count = recentEnrollments.filter((e) => {
      const enrolled = new Date(e.enrolled_at);
      return enrolled.getFullYear() === year && enrolled.getMonth() === month;
    }).length;
    monthlyData.push({
      month: `${year}/${String(month + 1).padStart(2, "0")}`,
      count,
    });
  }

  // ─── Course Enrollment Chart (published only) ───
  const publishedCourses = courses.filter((c) => c.status === "published");
  const courseEnrollmentData = publishedCourses
    .map((c) => ({
      name:
        c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
      count: enrollments.filter((e) => e.course_id === c.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ─── Course Completion Chart ───
  const courseCompletionData = publishedCourses
    .map((c) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.course_id === c.id
      );
      const total = courseEnrollments.length;
      const completed = courseEnrollments.filter(
        (e) => e.completed_at
      ).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        name:
          c.title.length > 20 ? c.title.slice(0, 20) + "..." : c.title,
        completionRate: rate,
        enrollments: total,
      };
    })
    .filter((c) => c.enrollments > 0)
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 10);

  // ─── Course Detail Table (all courses) ───
  const courseDetails = courses
    .map((c) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.course_id === c.id
      );
      const total = courseEnrollments.length;
      const completed = courseEnrollments.filter(
        (e) => e.completed_at
      ).length;
      const avgProgress =
        total > 0
          ? Math.round(
              courseEnrollments.reduce(
                (sum, e) => sum + Number(e.progress_percentage),
                0
              ) / total
            )
          : 0;
      return {
        id: c.id,
        title: c.title,
        status: c.status as string,
        enrollments: total,
        completed,
        completionRate:
          total > 0 ? Math.round((completed / total) * 100) : 0,
        avgProgress,
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments);

  // ─── User Progress Table (top 20) ───
  type EnrollmentUser = { full_name: string; email: string } | null;
  const userMap = new Map<
    string,
    {
      name: string;
      email: string;
      enrollments: number;
      completed: number;
      totalProgress: number;
    }
  >();

  for (const e of enrollments) {
    const u = e.users as unknown as EnrollmentUser;
    if (!u) continue;

    const existing = userMap.get(e.user_id);
    if (existing) {
      existing.enrollments++;
      if (e.completed_at) existing.completed++;
      existing.totalProgress += Number(e.progress_percentage);
    } else {
      userMap.set(e.user_id, {
        name: u.full_name || "未設定",
        email: u.email,
        enrollments: 1,
        completed: e.completed_at ? 1 : 0,
        totalProgress: Number(e.progress_percentage),
      });
    }
  }

  const userProgressData = Array.from(userMap.entries())
    .map(([id, data]) => ({
      id,
      ...data,
      avgProgress:
        data.enrollments > 0
          ? Math.round(data.totalProgress / data.enrollments)
          : 0,
    }))
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 20);

  const statusLabels: Record<string, string> = {
    published: "公開中",
    draft: "下書き",
    archived: "アーカイブ",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">受講分析</h1>
        <p className="text-muted-foreground">
          プラットフォーム全体の受講状況・進捗データを分析できます
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="総受講数"
          value={totalEnrollments}
          subtitle="受講"
          icon={GraduationCap}
        />
        <StatCard
          title="修了率"
          value={totalEnrollments > 0 ? `${completionRate}%` : "-"}
          subtitle={
            totalEnrollments > 0
              ? `${completedEnrollments} / ${totalEnrollments} 修了`
              : "データなし"
          }
          icon={CheckCircle2}
        />
        <StatCard
          title="クイズ合格率"
          value={totalAttempts > 0 ? `${quizPassRate}%` : "-"}
          subtitle={
            totalAttempts > 0
              ? `${passedAttempts} / ${totalAttempts} 合格`
              : "データなし"
          }
          icon={Target}
        />
        <StatCard
          title="修了証発行数"
          value={totalCertificates}
          subtitle="修了証"
          icon={Award}
        />
      </div>

      {/* Activity Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DailyActivityChart data={dailyData} />
        <MonthlyEnrollmentChart data={monthlyData} />
      </div>

      {/* Course Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CourseEnrollmentChart data={courseEnrollmentData} />
        <CourseCompletionChart data={courseCompletionData} />
      </div>

      {/* Course Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            コース別受講状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courseDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">コース名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>受講者数</TableHead>
                  <TableHead>修了数</TableHead>
                  <TableHead>修了率</TableHead>
                  <TableHead className="w-[200px]">平均進捗</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseDetails.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      {course.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          course.status === "published"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {statusLabels[course.status] ?? course.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{course.enrollments}</TableCell>
                    <TableCell>{course.completed}</TableCell>
                    <TableCell>{course.completionRate}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={course.avgProgress}
                          className="h-2 flex-1"
                        />
                        <span className="w-10 text-right text-sm text-muted-foreground">
                          {course.avgProgress}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              コースがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* User Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            ユーザー別進捗（上位20名）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userProgressData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">ユーザー</TableHead>
                  <TableHead>受講コース数</TableHead>
                  <TableHead>修了数</TableHead>
                  <TableHead className="w-[200px]">平均進捗</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProgressData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{user.enrollments}</TableCell>
                    <TableCell>{user.completed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={user.avgProgress}
                          className="h-2 flex-1"
                        />
                        <span className="w-10 text-right text-sm text-muted-foreground">
                          {user.avgProgress}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              データがありません
            </p>
          )}
        </CardContent>
      </Card>
      {/* CSV Export */}
      <CsvExportButtons />

      {/* Reminder Manager */}
      <ReminderManager />
    </div>
  );
}
