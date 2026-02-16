import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFilters } from "@/components/courses/course-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getActiveCategories } from "@/lib/actions/category";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface SearchParams {
  q?: string;
  category?: string;
  difficulty?: string;
  tag?: string;
  page?: string;
}

const PER_PAGE = 12;

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { q, category, difficulty, tag, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,short_description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (difficulty) {
    query = query.eq("difficulty_level", difficulty);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
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
  if (category) filterParams.category = category;
  if (difficulty) filterParams.difficulty = difficulty;
  if (tag) filterParams.tag = tag;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コース一覧</h1>
        <p className="text-muted-foreground">
          スキルアップのためのコースを見つけましょう
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <CourseFilters categories={categories} />
      </Suspense>

      {courses && courses.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/courses"
            searchParams={filterParams}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-semibold">
            コースが見つかりませんでした
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || category || difficulty || tag
              ? "検索条件を変更してみてください"
              : "まだコースが公開されていません"}
          </p>
        </div>
      )}
    </div>
  );
}
