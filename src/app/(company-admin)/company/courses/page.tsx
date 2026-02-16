import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";

export default async function CompanyCoursesPage() {
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
        <h1 className="text-2xl font-bold">コース管理</h1>
        <p className="text-muted-foreground">所属企業が設定されていません</p>
      </div>
    );
  }

  const companyId = profile.company_id;

  // Get company courses with course details
  const { data: companyCourses } = await supabase
    .from("company_courses")
    .select("id, assigned_at, expires_at, course_id, courses(id, title, status)")
    .eq("company_id", companyId);

  const courseList = companyCourses ?? [];

  // Get all company member IDs
  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const memberIds = (members ?? []).map((m) => m.id);

  // Get enrollments for these members in these courses
  const courseIds = courseList
    .map((cc) => cc.course_id)
    .filter((id): id is string => !!id);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, user_id, progress_percentage, completed_at")
    .in("user_id", memberIds.length > 0 ? memberIds : ["__none__"])
    .in("course_id", courseIds.length > 0 ? courseIds : ["__none__"]);

  const enrollmentData = enrollments ?? [];

  // Build per-course stats
  type CourseStats = {
    enrolledCount: number;
    completedCount: number;
    avgProgress: number;
  };
  const courseStatsMap = new Map<string, CourseStats>();
  for (const cid of courseIds) {
    const courseEnrollments = enrollmentData.filter((e) => e.course_id === cid);
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
    courseStatsMap.set(cid, {
      enrolledCount: total,
      completedCount: completed,
      avgProgress: avg,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コース管理</h1>
        <p className="text-muted-foreground">
          自社に割り当てられたコースの受講状況を確認できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            コース一覧（{courseList.length}コース）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courseList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">コース名</TableHead>
                  <TableHead>受講者数</TableHead>
                  <TableHead className="w-[200px]">平均進捗</TableHead>
                  <TableHead>完了者数</TableHead>
                  <TableHead>割り当て日</TableHead>
                  <TableHead>有効期限</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseList.map((cc) => {
                  const course = cc.courses as unknown as {
                    id: string;
                    title: string;
                    status: string;
                  } | null;
                  if (!course) return null;
                  const stats = courseStatsMap.get(course.id);

                  return (
                    <TableRow key={cc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{course.title}</span>
                          {course.status !== "published" && (
                            <Badge variant="secondary">{course.status}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats?.enrolledCount ?? 0} / {memberIds.length}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={stats?.avgProgress ?? 0}
                            className="h-2 flex-1"
                          />
                          <span className="text-sm text-muted-foreground w-10 text-right">
                            {stats?.avgProgress ?? 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{stats?.completedCount ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cc.assigned_at
                          ? new Date(cc.assigned_at).toLocaleDateString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {cc.expires_at ? (
                          <span
                            className={
                              new Date(cc.expires_at) < new Date()
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {new Date(cc.expires_at).toLocaleDateString("ja-JP")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">無期限</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                割り当てられたコースがありません
              </p>
              <p className="text-xs text-muted-foreground">
                管理者にコースの割り当てを依頼してください
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
