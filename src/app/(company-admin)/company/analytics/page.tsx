import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  CourseEnrollmentChart,
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
import { GraduationCap, CheckCircle2, Target, TrendingUp } from "lucide-react";

export default async function CompanyAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">分析</h1>
        <p className="text-muted-foreground">所属企業が設定されていません</p>
      </div>
    );
  }

  const companyId = profile.company_id;

  // Get member IDs
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);

  // Parallel data fetching
  const [enrollmentsRes, quizAttemptsRes, companyCoursesRes] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          "id, user_id, course_id, progress_percentage, completed_at, enrolled_at"
        )
        .in("user_id", memberIds.length > 0 ? memberIds : ["__none__"]),
      supabase
        .from("quiz_attempts")
        .select("id, user_id, passed")
        .in("user_id", memberIds.length > 0 ? memberIds : ["__none__"]),
      supabase
        .from("company_courses")
        .select("course_id, courses(id, title)")
        .eq("company_id", companyId),
    ]);

  const enrollments = enrollmentsRes.data ?? [];
  const quizAttempts = quizAttemptsRes.data ?? [];
  const companyCourses = companyCoursesRes.data ?? [];

  // Summary stats
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter(
    (e) => e.completed_at
  ).length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  const avgProgress =
    totalEnrollments > 0
      ? Math.round(
          enrollments.reduce(
            (sum, e) => sum + Number(e.progress_percentage),
            0
          ) / totalEnrollments
        )
      : 0;

  const totalAttempts = quizAttempts.length;
  const passedAttempts = quizAttempts.filter((a) => a.passed).length;
  const quizPassRate =
    totalAttempts > 0
      ? Math.round((passedAttempts / totalAttempts) * 100)
      : 0;

  // Course enrollment chart data
  type CompanyCourse = {
    course_id: string;
    courses: { id: string; title: string } | null;
  };
  const courseChartData = (companyCourses as unknown as CompanyCourse[])
    .filter((cc) => cc.courses)
    .map((cc) => {
      const count = enrollments.filter(
        (e) => e.course_id === cc.courses!.id
      ).length;
      return {
        name:
          cc.courses!.title.length > 15
            ? cc.courses!.title.slice(0, 15) + "..."
            : cc.courses!.title,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Monthly enrollment trend (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const count = enrollments.filter((e) => {
      const enrolled = new Date(e.enrolled_at);
      return (
        enrolled.getFullYear() === year && enrolled.getMonth() === month
      );
    }).length;
    monthlyData.push({
      month: `${year}/${String(month + 1).padStart(2, "0")}`,
      count,
    });
  }

  // Per-member progress table
  const memberProgressData = memberList
    .map((m) => {
      const userEnrollments = enrollments.filter((e) => e.user_id === m.id);
      const total = userEnrollments.length;
      const completed = userEnrollments.filter((e) => e.completed_at).length;
      const avg =
        total > 0
          ? Math.round(
              userEnrollments.reduce(
                (sum, e) => sum + Number(e.progress_percentage),
                0
              ) / total
            )
          : 0;
      return {
        id: m.id,
        name: m.full_name,
        enrollments: total,
        completed,
        avgProgress: avg,
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">分析</h1>
        <p className="text-muted-foreground">
          自社の受講状況・クイズ成績の分析データを確認できます
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="総受講数"
          value={totalEnrollments}
          subtitle="受講"
          icon={GraduationCap}
        />
        <StatCard
          title="完了率"
          value={totalEnrollments > 0 ? `${completionRate}%` : "-"}
          subtitle={
            totalEnrollments > 0
              ? `${completedEnrollments} / ${totalEnrollments} 完了`
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
          title="平均進捗率"
          value={totalEnrollments > 0 ? `${avgProgress}%` : "-"}
          subtitle={totalEnrollments > 0 ? "全受講の平均" : "データなし"}
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CourseEnrollmentChart data={courseChartData} />
        <MonthlyEnrollmentChart data={monthlyData} />
      </div>

      {/* Member progress table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">社員別進捗</CardTitle>
        </CardHeader>
        <CardContent>
          {memberProgressData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">社員名</TableHead>
                  <TableHead>受講コース数</TableHead>
                  <TableHead>完了数</TableHead>
                  <TableHead className="w-[200px]">平均進捗</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberProgressData.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>{member.enrollments}</TableCell>
                    <TableCell>{member.completed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={member.avgProgress}
                          className="h-2 flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-10 text-right">
                          {member.avgProgress}%
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
    </div>
  );
}
