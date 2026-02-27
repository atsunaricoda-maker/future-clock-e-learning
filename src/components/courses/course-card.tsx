import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BarChart3, BookOpen } from "lucide-react";
import type { Course } from "@/types/database";

const difficultyLabel: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

interface CourseCardProps {
  course: Course & { section_count?: number; lesson_count?: number };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.slug}`}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
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
          {course.difficulty_level && (
            <Badge
              className={`absolute top-2 right-2 ${difficultyColor[course.difficulty_level] || ""}`}
              variant="secondary"
            >
              {difficultyLabel[course.difficulty_level] || course.difficulty_level}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          {course.category && (
            <p className="mb-1 text-xs font-medium text-primary">
              {course.category}
            </p>
          )}
          <h3 className="line-clamp-2 text-base font-semibold group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.short_description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {course.short_description}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {course.price > 0
              ? `¥${course.price.toLocaleString()}`
              : "無料"}
          </span>
          {course.estimated_duration_min && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.estimated_duration_min}分
            </span>
          )}
          {course.lesson_count !== undefined && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {course.lesson_count}レッスン
            </span>
          )}
          {course.tags && course.tags.length > 0 && (
            <div className="ml-auto flex gap-1">
              {course.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
