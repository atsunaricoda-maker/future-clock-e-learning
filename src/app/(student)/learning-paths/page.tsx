import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Route, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";

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

export default async function LearningPathsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch published learning paths with their courses
  const { data: pathsRaw } = await supabase
    .from("learning_paths")
    .select(
      "id, title, slug, description, difficulty_level, estimated_duration_min, learning_path_courses(course_id, order_index, is_required, courses(id, title, slug))"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  type PathCourse = {
    course_id: string;
    order_index: number;
    is_required: boolean;
    courses: { id: string; title: string; slug: string } | null;
  };

  type PathRow = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    difficulty_level: string | null;
    estimated_duration_min: number | null;
    learning_path_courses: PathCourse[];
  };

  const paths = (pathsRaw ?? []) as unknown as PathRow[];

  // Get user's enrollment progress if logged in
  let enrollmentMap = new Map<string, { progress: number; completed: boolean }>();
  if (user) {
    const courseIds = paths.flatMap((p) =>
      p.learning_path_courses
        .filter((c) => c.courses)
        .map((c) => c.courses!.id)
    );

    if (courseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, progress_percentage, completed_at")
        .eq("user_id", user.id)
        .in("course_id", courseIds);

      for (const e of enrollments ?? []) {
        enrollmentMap.set(e.course_id, {
          progress: Number(e.progress_percentage),
          completed: !!e.completed_at,
        });
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">学習パス</h1>
        <p className="text-muted-foreground">
          体系的に学べるコースの組み合わせです
        </p>
      </div>

      {paths.length > 0 ? (
        <div className="space-y-6">
          {paths.map((path) => {
            const courses = path.learning_path_courses
              .filter((c) => c.courses)
              .sort((a, b) => a.order_index - b.order_index);
            const totalCourses = courses.length;
            const completedCourses = courses.filter(
              (c) => enrollmentMap.get(c.courses!.id)?.completed
            ).length;
            const overallProgress =
              totalCourses > 0
                ? Math.round((completedCourses / totalCourses) * 100)
                : 0;

            return (
              <Card key={path.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Route className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{path.title}</CardTitle>
                      </div>
                      {path.description && (
                        <p className="text-sm text-muted-foreground">
                          {path.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {path.difficulty_level && (
                        <Badge
                          variant="outline"
                          className={difficultyColor[path.difficulty_level] || ""}
                        >
                          {difficultyLabel[path.difficulty_level] || path.difficulty_level}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {totalCourses}コース
                      </Badge>
                    </div>
                  </div>
                  {user && totalCourses > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={overallProgress} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground shrink-0">
                        {completedCourses}/{totalCourses} 修了
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {courses.map((course, i) => {
                      const enrollment = enrollmentMap.get(course.courses!.id);
                      const isCompleted = enrollment?.completed;
                      const progress = enrollment?.progress ?? 0;

                      return (
                        <Link
                          key={course.course_id}
                          href={`/courses/${course.courses!.slug}`}
                          className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isCompleted
                                ? "bg-green-100 text-green-700"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {course.courses!.title}
                            </p>
                            {enrollment && !isCompleted && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress
                                  value={progress}
                                  className="h-1.5 flex-1 max-w-32"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            )}
                          </div>
                          {!course.is_required && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              任意
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Route className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              学習パスはまだ公開されていません
            </h3>
            <p className="text-sm text-muted-foreground">
              準備ができ次第、ここに表示されます
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
