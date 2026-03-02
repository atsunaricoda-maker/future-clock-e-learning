import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRoleBadge } from "@/components/admin/user-role-badge";
import { UserActions } from "@/components/admin/user-actions";
import { AdminUserFilters } from "@/components/admin/admin-user-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import type { UserRole } from "@/types/database";
import { sanitizeFilterInput } from "@/lib/sanitize";

const PER_PAGE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { q, role, status, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("users")
    .select("*, companies(name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    const sq = sanitizeFilterInput(q);
    query = query.or(`display_name.ilike.%${sq}%,email.ilike.%${sq}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (currentPage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  query = query.range(from, to);

  const { data: users, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (role) filterParams.role = role;
  if (status) filterParams.status = status;

  const hasFilters = !!(q || role || status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground">
            ユーザーの一覧・ロール変更・ステータス管理を行います
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <AdminUserFilters />
      </Suspense>

      {users && users.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">ユーザー</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>企業</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>最終ログイン</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const company = u.companies as { name: string } | null;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {(u.display_name || u.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {u.display_name || "未設定"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <UserRoleBadge role={u.role as UserRole} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            有効
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-700"
                          >
                            無効
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_login_at
                          ? formatRelativeTime(new Date(u.last_login_at))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        <UserActions
                          userId={u.id}
                          currentRole={u.role as UserRole}
                          isActive={u.is_active}
                          isSelf={currentUser?.id === u.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/users"
            searchParams={filterParams}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            {hasFilters ? "条件に一致するユーザーがいません" : "ユーザーがまだいません"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "検索条件を変更してみてください" : "ユーザーが登録すると、ここに表示されます"}
          </p>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP");
}
