import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, CheckCircle2 } from "lucide-react";
import type { Course, Enrollment } from "@/types/database";

interface EnrolledCourseCardProps {
  course: Course;
  enrollment: Enrollment;
  firstLessonId?: string | null;
}

export function EnrolledCourseCard({
  course,
  enrollment,
  firstLessonId,
}: EnrolledCourseCardProps) {
  const isCompleted = enrollment.progress_percentage >= 100;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge className="bg-green-600 text-white text-sm px-3 py-1">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              修了済み
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex-1 p-4">
        {course.category && (
          <p className="mb-1 text-xs font-medium text-primary">
            {course.category}
          </p>
        )}
        <h3 className="line-clamp-2 text-base font-semibold">{course.title}</h3>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">進捗</span>
            <span className="font-medium">
              {Math.round(enrollment.progress_percentage)}%
            </span>
          </div>
          <Progress value={enrollment.progress_percentage} className="h-2" />
        </div>
      </CardContent>

      <CardFooter className="border-t p-4">
        {firstLessonId ? (
          <Button asChild className="w-full" size="sm">
            <Link href={`/courses/${course.slug}/learn/${firstLessonId}`}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {isCompleted ? "もう一度学習する" : "学習を続ける"}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href={`/courses/${course.slug}`}>
              コース詳細を見る
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
