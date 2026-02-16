import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseReviews } from "@/components/courses/course-reviews";
import { EnrollButton } from "@/components/courses/enroll-button";
import { checkPrerequisites } from "@/lib/actions/prerequisite";
import { Clock, BarChart3, BookOpen, Tag, Users } from "lucide-react";
import type { Section, Lesson } from "@/types/database";

type SectionWithLessons = Section & { lessons: Lesson[] };

const difficultyLabel: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

const difficultyColor: Record<string, string> = {
  beginner: "border-green-200 bg-green-50 text-green-700",
  intermediate: "border-yellow-200 bg-yellow-50 text-yellow-700",
  advanced: "border-red-200 bg-red-50 text-red-700",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!course) {
    notFound();
  }

  const [sectionsResult, enrollmentCountResult, authResult] = await Promise.all([
    supabase
      .from("sections")
      .select("*, lessons(*)")
      .eq("course_id", course.id)
      .order("order_index", { ascending: true })
      .order("order_index", { referencedTable: "lessons", ascending: true }),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id),
    supabase.auth.getUser(),
  ]);

  const typedSections: SectionWithLessons[] = (sectionsResult.data || []) as SectionWithLessons[];
  const enrollmentCount = enrollmentCountResult.count ?? 0;
  const user = authResult.data.user;

  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .single();
    isEnrolled = !!enrollment;
  }

  // Check prerequisites for non-enrolled logged-in users
  let unmetPrerequisites: { id: string; title: string; slug: string }[] = [];
  if (user && !isEnrolled) {
    const prereqResult = await checkPrerequisites(user.id, course.id);
    if (!prereqResult.met) {
      unmetPrerequisites = prereqResult.unmetPrerequisites;
    }
  }

  // Fetch reviews
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, created_at, users(full_name)")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });

  type ReviewRow = {
    id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    users: { full_name: string } | null;
  };

  const reviewsData = ((reviewsRaw ?? []) as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    user_name: r.users?.full_name ?? "匿名",
  }));

  const userReview = user
    ? ((reviewsRaw ?? []) as unknown as ReviewRow[])
        .filter((r) => r.user_id === user.id)
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          user_name: r.users?.full_name ?? "匿名",
        }))[0] ?? null
    : null;

  const firstLessonId =
    typedSections.length > 0 && typedSections[0].lessons?.length > 0
      ? typedSections[0].lessons[0].id
      : null;

  const totalLessons = typedSections.reduce(
    (acc, s) => acc + (s.lessons?.length || 0),
    0
  );

  const totalDurationSeconds = typedSections.reduce(
    (acc, s) =>
      acc +
      (s.lessons || []).reduce(
        (lacc, l) => lacc + (l.duration_seconds || 0),
        0
      ),
    0
  );

  const formatTotalDuration = (seconds: number) => {
    if (seconds === 0) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ""}`;
    return `${minutes}分`;
  };

  const totalDuration = formatTotalDuration(totalDurationSeconds);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero section */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {course.category && (
              <Badge variant="secondary">{course.category}</Badge>
            )}
            {course.difficulty_level && (
              <Badge
                variant="outline"
                className={difficultyColor[course.difficulty_level] || ""}
              >
                {difficultyLabel[course.difficulty_level] || course.difficulty_level}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold">{course.title}</h1>

          {course.short_description && (
            <p className="text-lg text-muted-foreground">
              {course.short_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {(totalDuration || course.estimated_duration_min) && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {totalDuration ?? `推定 ${course.estimated_duration_min}分`}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {totalLessons} レッスン
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              {typedSections.length} セクション
            </span>
            {enrollmentCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {enrollmentCount}人が受講中
              </span>
            )}
          </div>

          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {course.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Enrollment sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-6 space-y-4">
              {course.thumbnail_url ? (
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md bg-muted">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}

              <EnrollButton
                courseId={course.id}
                courseSlug={course.slug}
                isEnrolled={isEnrolled}
                isLoggedIn={!!user}
                firstLessonId={firstLessonId}
                unmetPrerequisites={unmetPrerequisites}
              />

              <div className="grid grid-cols-2 gap-3 pt-2 text-center text-sm">
                <div className="rounded-md border p-2">
                  <p className="font-semibold">{typedSections.length}</p>
                  <p className="text-xs text-muted-foreground">セクション</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="font-semibold">{totalLessons}</p>
                  <p className="text-xs text-muted-foreground">レッスン</p>
                </div>
                {totalDuration && (
                  <div className="rounded-md border p-2">
                    <p className="font-semibold">{totalDuration}</p>
                    <p className="text-xs text-muted-foreground">合計時間</p>
                  </div>
                )}
                {enrollmentCount > 0 && (
                  <div className="rounded-md border p-2">
                    <p className="font-semibold">{enrollmentCount}</p>
                    <p className="text-xs text-muted-foreground">受講者数</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">コース概要</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {course.description}
          </div>
        </div>
      )}

      {/* Curriculum */}
      {typedSections.length > 0 && (
        <CourseCurriculum
          sections={typedSections}
          isEnrolled={isEnrolled}
        />
      )}

      {/* Reviews */}
      <CourseReviews
        courseId={course.id}
        courseSlug={course.slug}
        reviews={reviewsData}
        currentUserId={user?.id ?? null}
        userReview={userReview}
        isEnrolled={isEnrolled}
      />
    </div>
  );
}
