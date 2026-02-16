import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EnrolledCourseCard } from "@/components/courses/enrolled-course-card";
import { MyCourseFilters } from "@/components/courses/my-course-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { Course, Enrollment } from "@/types/database";

export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const { status, sort } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch enrollments with courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  // For each enrollment, get the first lesson ID
  const enrollmentsWithFirstLesson = await Promise.all(
    (enrollments || []).map(async (enrollment) => {
      const course = enrollment.courses as unknown as Course;
      const { data: firstSection } = await supabase
        .from("sections")
        .select("id")
        .eq("course_id", course.id)
        .order("order_index", { ascending: true })
        .limit(1)
        .single();

      let firstLessonId: string | null = null;
      if (firstSection) {
        const { data: firstLesson } = await supabase
          .from("lessons")
          .select("id")
          .eq("section_id", firstSection.id)
          .order("order_index", { ascending: true })
          .limit(1)
          .single();
        firstLessonId = firstLesson?.id || null;
      }

      return {
        enrollment: enrollment as unknown as Enrollment,
        course,
        firstLessonId,
      };
    })
  );

  // Filter by status
  let filtered = enrollmentsWithFirstLesson;
  if (status === "in_progress") {
    filtered = filtered.filter(
      ({ enrollment }) => enrollment.progress_percentage < 100
    );
  } else if (status === "completed") {
    filtered = filtered.filter(
      ({ enrollment }) => enrollment.progress_percentage >= 100
    );
  }

  // Sort
  if (sort === "oldest") {
    filtered = [...filtered].sort(
      (a, b) =>
        new Date(a.enrollment.enrolled_at).getTime() -
        new Date(b.enrollment.enrolled_at).getTime()
    );
  } else if (sort === "progress_desc") {
    filtered = [...filtered].sort(
      (a, b) =>
        b.enrollment.progress_percentage - a.enrollment.progress_percentage
    );
  } else if (sort === "progress_asc") {
    filtered = [...filtered].sort(
      (a, b) =>
        a.enrollment.progress_percentage - b.enrollment.progress_percentage
    );
  } else if (sort === "title") {
    filtered = [...filtered].sort((a, b) =>
      a.course.title.localeCompare(b.course.title, "ja")
    );
  }
  // default: recent (already sorted by enrolled_at desc from DB)

  const totalCount = enrollmentsWithFirstLesson.length;
  const inProgressCount = enrollmentsWithFirstLesson.filter(
    ({ enrollment }) => enrollment.progress_percentage < 100
  ).length;
  const completedCount = enrollmentsWithFirstLesson.filter(
    ({ enrollment }) => enrollment.progress_percentage >= 100
  ).length;

  const hasFilters = !!(status || sort);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">マイコース</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>全{totalCount}コース</span>
            <span>/</span>
            <span>受講中 {inProgressCount}</span>
            <span>/</span>
            <span>修了 {completedCount}</span>
          </div>
        </div>
      </div>

      {totalCount > 0 && (
        <Suspense fallback={<Skeleton className="h-10 w-full" />}>
          <MyCourseFilters />
        </Suspense>
      )}

      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ enrollment, course, firstLessonId }) => (
            <EnrolledCourseCard
              key={enrollment.id}
              course={course}
              enrollment={enrollment}
              firstLessonId={firstLessonId}
            />
          ))}
        </div>
      ) : totalCount > 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">
            条件に一致するコースがありません
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            フィルター条件を変更してみてください
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-semibold">
            まだコースに登録していません
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            コース一覧から興味のあるコースを見つけて受講を始めましょう
          </p>
          <Button asChild className="mt-4">
            <Link href="/courses">コースを探す</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
