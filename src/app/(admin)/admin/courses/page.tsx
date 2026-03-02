import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CourseStatusBadge } from "@/components/admin/course-status-badge";
import { CourseActions } from "@/components/admin/course-actions";
import { AdminCourseFilters } from "@/components/admin/admin-course-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getActiveCategories } from "@/lib/actions/category";
import { Plus, BookOpen } from "lucide-react";

const PER_PAGE = 20;

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { q, status, category, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.eq("category", category);
  }

  const from = (currentPage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  query = query.range(from, to);

  const [{ data: courses, count }, categories] = await Promise.all([
    query,
    getActiveCategories(),
  ]);
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (status) filterParams.status = status;
  if (category) filterParams.category = category;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">コース管理</h1>
          <p className="text-muted-foreground">
            コースの作成・編集・公開を管理します
          </p>
        </div>
        <Link href="/admin/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <AdminCourseFilters categories={categories} />
      </Suspense>

      {courses && courses.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">タイトル</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>価格</TableHead>
                  <TableHead>公開</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="font-medium hover:underline"
                      >
                        {course.title}
                      </Link>
                      {course.short_description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {course.short_description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <CourseStatusBadge status={course.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {course.category || "-"}
                    </TableCell>
                    <TableCell>
                      {course.price > 0
                        ? `¥${course.price.toLocaleString()}`
                        : "無料"}
                    </TableCell>
                    <TableCell>
                      {course.is_public ? "公開" : "限定"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <CourseActions
                        courseId={course.id}
                        currentStatus={course.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/courses"
            searchParams={filterParams}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            {q || status ? "条件に一致するコースがありません" : "コースがまだありません"}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {q || status ? "検索条件を変更してみてください" : "最初のコースを作成しましょう"}
          </p>
          {!q && !status && (
            <Link href="/admin/courses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                コースを作成
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
