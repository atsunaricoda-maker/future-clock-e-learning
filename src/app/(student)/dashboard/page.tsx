import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyActivityChart } from "@/components/dashboard/weekly-activity-chart";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { getActiveAnnouncements } from "@/lib/actions/announcement";
import { getTodayLearningMinutes } from "@/lib/actions/learning-session";
import { formatRelativeTime, formatDurationHours } from "@/lib/format";
import {
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Flame,
  Medal,
} from "lucide-react";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    profileRes,
    enrollmentsRes,
    completedProgressRes,
    recentActivityRes,
    quizAttemptsRes,
    recommendedCoursesRes,
    weeklyActivityRes,
    streakActivityRes,
    certificatesRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, role, company_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("enrollments")
      .select("*, courses(id, title, slug, thumbnail_url)")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, lessons(duration_seconds)")
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("lesson_progress")
      .select(
        "id, completed_at, lessons(title, sections(courses(title, slug)))"
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("quiz_attempts")
      .select("id, score, passed, completed_at, quizzes(title, lessons(title, sections(courses(title))))")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("courses")
      .select("id, title, slug, short_description, category, difficulty_level")
      .eq("status", "published")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20),
    // Weekly activity: completed lessons in last 7 days
    supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Streak: completed lessons in last 30 days for streak calculation
    supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    // Certificates earned
    supabase
      .from("certificates")
      .select("id, issued_at, certificate_number, courses(title, slug)")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  const enrollments = enrollmentsRes.data ?? [];
  const completedProgress = completedProgressRes.data ?? [];
  const recentActivity = recentActivityRes.data ?? [];
  const quizAttempts = quizAttemptsRes.data ?? [];
  const allPublicCourses = recommendedCoursesRes.data ?? [];

  // Fetch announcements and today's learning time
  const [announcements, todayLearningMinutes] = await Promise.all([
    getActiveAnnouncements({
      role: profile?.role ?? "student",
      companyId: profile?.company_id,
    }),
    getTodayLearningMinutes(),
  ]);
  const weeklyActivityRaw = weeklyActivityRes.data ?? [];
  const streakActivityRaw = streakActivityRes.data ?? [];
  const certificatesRaw = certificatesRes.data ?? [];

  // Weekly activity chart data (last 7 days)
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const weeklyChartData: { day: string; lessons: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const count = weeklyActivityRaw.filter((item) => {
      const t = new Date(item.completed_at!);
      return t >= dayStart && t < dayEnd;
    }).length;
    weeklyChartData.push({
      day: `${d.getMonth() + 1}/${d.getDate()}(${dayLabels[d.getDay()]})`,
      lessons: count,
    });
  }

  // Learning streak calculation
  let streak = 0;
  const streakDates = new Set(
    streakActivityRaw.map((item) => {
      const d = new Date(item.completed_at!);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  for (let i = 0; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (streakDates.has(key)) {
      streak++;
    } else if (i > 0) {
      // Allow today to be missing (day not over yet), but break if any previous day is missing
      break;
    }
  }

  // Certificates
  type CertificateItem = {
    id: string;
    issuedAt: string;
    certificateNumber: string;
    courseTitle: string;
    courseSlug: string;
  };
  const certificates: CertificateItem[] = certificatesRaw.map((c) => {
    const course = c.courses as unknown as { title: string; slug: string } | null;
    return {
      id: c.id,
      issuedAt: c.issued_at,
      certificateNumber: c.certificate_number,
      courseTitle: course?.title ?? "不明",
      courseSlug: course?.slug ?? "",
    };
  });

  // Derive stats
  const inProgressEnrollments = enrollments.filter(
    (e) => Number(e.progress_percentage) < 100
  );
  const completedEnrollments = enrollments.filter(
    (e) => Number(e.progress_percentage) >= 100
  );

  const totalSeconds = completedProgress.reduce((sum, lp) => {
    const lesson = lp.lessons as unknown as {
      duration_seconds: number | null;
    } | null;
    return sum + (lesson?.duration_seconds ?? 0);
  }, 0);
  const totalHoursDisplay = formatDurationHours(totalSeconds);

  const completedLessonIds = new Set(completedProgress.map((p) => p.lesson_id));

  // Continue Learning items
  type ContinueLearningItem = {
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    progressPercentage: number;
    nextLessonId: string | null;
    nextLessonTitle: string | null;
  };

  const continueLearningItems: ContinueLearningItem[] = [];
  const topInProgress = inProgressEnrollments.slice(0, 3);
  if (topInProgress.length > 0) {
    const courseQueries = await Promise.all(
      topInProgress.map((enrollment) => {
        const course = enrollment.courses as unknown as {
          id: string;
          title: string;
          slug: string;
        };
        return supabase
          .from("sections")
          .select("id, title, order_index, lessons(id, title, order_index)")
          .eq("course_id", course.id)
          .order("order_index", { ascending: true })
          .order("order_index", {
            referencedTable: "lessons",
            ascending: true,
          });
      })
    );

    for (let i = 0; i < topInProgress.length; i++) {
      const enrollment = topInProgress[i];
      const course = enrollment.courses as unknown as {
        id: string;
        title: string;
        slug: string;
      };
      const sections = courseQueries[i].data ?? [];

      let nextLessonId: string | null = null;
      let nextLessonTitle: string | null = null;

      for (const section of sections) {
        const lessons =
          (section.lessons as unknown as {
            id: string;
            title: string;
            order_index: number;
          }[]) ?? [];
        for (const lesson of lessons) {
          if (!completedLessonIds.has(lesson.id)) {
            nextLessonId = lesson.id;
            nextLessonTitle = lesson.title;
            break;
          }
        }
        if (nextLessonId) break;
      }

      continueLearningItems.push({
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        progressPercentage: Math.round(Number(enrollment.progress_percentage)),
        nextLessonId,
        nextLessonTitle,
      });
    }
  }

  // Recent activity items
  type RecentActivityItem = {
    lessonTitle: string;
    courseTitle: string;
    timestamp: string;
  };

  const recentActivityItems: RecentActivityItem[] = [];
  for (const item of recentActivity) {
    const lesson = item.lessons as unknown as {
      title: string;
      sections: { courses: { title: string; slug: string } };
    } | null;
    if (lesson && item.completed_at) {
      recentActivityItems.push({
        lessonTitle: lesson.title,
        courseTitle: lesson.sections?.courses?.title ?? "",
        timestamp: item.completed_at,
      });
    }
  }

  // Quiz results
  type QuizResultItem = {
    quizTitle: string;
    courseTitle: string;
    score: number;
    passed: boolean;
    completedAt: string;
  };

  const quizResultItems: QuizResultItem[] = [];
  for (const attempt of quizAttempts) {
    const quiz = attempt.quizzes as unknown as {
      title: string | null;
      lessons: { title: string; sections: { courses: { title: string } } };
    } | null;
    if (quiz && attempt.completed_at) {
      quizResultItems.push({
        quizTitle: quiz.title ?? quiz.lessons?.title ?? "クイズ",
        courseTitle: quiz.lessons?.sections?.courses?.title ?? "",
        score: attempt.score ?? 0,
        passed: attempt.passed ?? false,
        completedAt: attempt.completed_at,
      });
    }
  }

  // Recommended courses (exclude already enrolled)
  const enrolledCourseIds = new Set(
    enrollments.map((e) => {
      const course = e.courses as unknown as { id: string };
      return course?.id;
    })
  );
  const recommendedCourses = allPublicCourses
    .filter((c) => !enrolledCourseIds.has(c.id))
    .slice(0, 3);

  const difficultyLabel: Record<string, string> = {
    beginner: "初級",
    intermediate: "中級",
    advanced: "上級",
  };

  // Average progress
  const avgProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + Number(e.progress_percentage), 0) /
            enrollments.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          ようこそ、{profile?.full_name ?? "受講生"}さん
        </h1>
        <p className="text-muted-foreground">学習の進捗を確認しましょう</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="受講中コース"
          value={inProgressEnrollments.length}
          subtitle="コース"
          icon={BookOpen}
        />
        <StatCard
          title="本日の学習"
          value={todayLearningMinutes >= 60 ? `${Math.floor(todayLearningMinutes / 60)}h${todayLearningMinutes % 60}m` : `${todayLearningMinutes}分`}
          subtitle={totalHoursDisplay ? `累計: ${totalHoursDisplay}` : ""}
          icon={Clock}
        />
        <StatCard
          title="修了済みコース"
          value={completedEnrollments.length}
          subtitle="コース"
          icon={Award}
        />
        <StatCard
          title="平均進捗率"
          value={`${avgProgress}%`}
          subtitle=""
          icon={TrendingUp}
        />
      </div>

      {/* Weekly Activity & Streak */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyActivityChart data={weeklyChartData} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4" />
              学習ストリーク
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-5xl font-bold ${streak >= 7 ? "text-orange-500" : streak >= 3 ? "text-yellow-500" : "text-muted-foreground"}`}>
                {streak}
              </span>
              <span className="text-lg text-muted-foreground">日連続</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {streak === 0
                ? "今日レッスンを完了して学習を始めましょう！"
                : streak < 3
                  ? "いいスタートです！毎日続けましょう！"
                  : streak < 7
                    ? "素晴らしい！この調子で頑張りましょう！"
                    : "🔥 驚異的な継続力です！"}
            </p>
            <div className="mt-2 flex gap-1">
              {weeklyChartData.map((d, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-sm ${d.lessons > 0 ? "bg-green-500" : "bg-muted"}`}
                  title={`${d.day}: ${d.lessons}レッスン`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Continue Learning */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>学習を続ける</CardTitle>
            {continueLearningItems.length === 0 && (
              <CardDescription>
                {enrollments.length === 0
                  ? "まだコースに登録されていません。コース一覧から受講を始めましょう。"
                  : "全てのコースを修了しました！"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {continueLearningItems.length > 0 ? (
              <div className="space-y-4">
                {continueLearningItems.map((item) => (
                  <div
                    key={item.courseId}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.courseTitle}
                      </p>
                      {item.nextLessonTitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          次のレッスン: {item.nextLessonTitle}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Progress
                          value={item.progressPercentage}
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {item.progressPercentage}%
                        </span>
                      </div>
                    </div>
                    {item.nextLessonId && (
                      <Button asChild size="sm" className="shrink-0">
                        <Link
                          href={`/courses/${item.courseSlug}/learn/${item.nextLessonId}`}
                        >
                          続ける
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/courses">コース一覧を見る</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最近の学習</CardTitle>
            {recentActivityItems.length === 0 && (
              <CardDescription>まだ学習履歴がありません</CardDescription>
            )}
          </CardHeader>
          {recentActivityItems.length > 0 && (
            <CardContent>
              <div className="space-y-4">
                {recentActivityItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 rounded-full bg-green-100 p-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.lessonTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.courseTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quiz Results + Recommended Courses */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quiz Results */}
        <Card>
          <CardHeader>
            <CardTitle>最近のクイズ結果</CardTitle>
            {quizResultItems.length === 0 && (
              <CardDescription>まだクイズを受験していません</CardDescription>
            )}
          </CardHeader>
          {quizResultItems.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {quizResultItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <div className="shrink-0">
                      {item.passed ? (
                        <div className="rounded-full bg-green-100 p-1.5">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-red-100 p-1.5">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.quizTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.courseTitle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={item.passed ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {item.score}%
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(item.completedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Recommended Courses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>おすすめコース</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/courses">
                  すべて見る
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recommendedCourses.length > 0 ? (
              <div className="space-y-3">
                {recommendedCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{course.title}</p>
                    {course.short_description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {course.short_description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {course.category && (
                        <Badge variant="secondary" className="text-xs">
                          {course.category}
                        </Badge>
                      )}
                      {course.difficulty_level && (
                        <Badge variant="outline" className="text-xs">
                          {difficultyLabel[course.difficulty_level] ?? course.difficulty_level}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                すべてのコースに登録済みです
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              取得した修了証
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="shrink-0 rounded-full bg-yellow-100 p-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {cert.courseTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No. {cert.certificateNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(cert.issuedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
