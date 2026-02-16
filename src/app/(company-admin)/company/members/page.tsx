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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { BulkEnrollmentUploader } from "@/components/admin/bulk-enrollment-uploader";
import { MemberInviteForm } from "@/components/company/member-invite-form";
import { formatRelativeTime } from "@/lib/format";
import { Users } from "lucide-react";

export default async function CompanyMembersPage() {
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
        <h1 className="text-2xl font-bold">社員管理</h1>
        <p className="text-muted-foreground">所属企業が設定されていません</p>
      </div>
    );
  }

  const companyId = profile.company_id;

  // Get company members with their enrollment data
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, role, is_active, last_sign_in_at, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const memberList = members ?? [];

  // Get courses assigned to this company
  const { data: companyCourses } = await supabase
    .from("company_courses")
    .select("course_id, courses(id, title)")
    .eq("company_id", companyId);

  const assignedCourses = (companyCourses ?? [])
    .map((cc) => {
      const course = cc.courses as unknown as { id: string; title: string } | null;
      return course ? { id: course.id, title: course.title } : null;
    })
    .filter((c): c is { id: string; title: string } => c !== null);

  // Get enrollment stats for each member
  const memberIds = memberList.map((m) => m.id);
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id, progress_percentage, completed_at")
    .in("user_id", memberIds.length > 0 ? memberIds : ["__none__"]);

  // Get pending invitations
  const { data: pendingInvitations } = await supabase
    .from("invitations")
    .select("id, email, created_at, expires_at")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const enrollmentData = enrollments ?? [];

  // Build per-member stats
  const memberStats = new Map<
    string,
    { courseCount: number; avgProgress: number; completedCount: number }
  >();
  for (const id of memberIds) {
    const userEnrollments = enrollmentData.filter((e) => e.user_id === id);
    const total = userEnrollments.length;
    const avg =
      total > 0
        ? Math.round(
            userEnrollments.reduce(
              (sum, e) => sum + Number(e.progress_percentage),
              0
            ) / total
          )
        : 0;
    const completed = userEnrollments.filter((e) => e.completed_at).length;
    memberStats.set(id, {
      courseCount: total,
      avgProgress: avg,
      completedCount: completed,
    });
  }

  const roleLabels: Record<string, string> = {
    admin: "管理者",
    company_admin: "企業管理者",
    student: "受講生",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">社員管理</h1>
        <p className="text-muted-foreground">
          自社の社員一覧と受講状況を確認できます
        </p>
      </div>

      <MemberInviteForm pendingInvitations={pendingInvitations ?? []} />

      {assignedCourses.length > 0 && (
        <BulkEnrollmentUploader
          companyId={companyId}
          availableCourses={assignedCourses}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            社員一覧（{memberList.length}名）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">社員</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>受講コース数</TableHead>
                  <TableHead className="w-[200px]">平均進捗</TableHead>
                  <TableHead>最終ログイン</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberList.map((member) => {
                  const stats = memberStats.get(member.id);
                  const initials = member.full_name
                    ? member.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "?";

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {member.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[member.role] ?? member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{stats?.courseCount ?? 0}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {member.last_sign_in_at
                          ? formatRelativeTime(member.last_sign_in_at)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.is_active ? "default" : "secondary"}
                        >
                          {member.is_active ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                社員が登録されていません
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
