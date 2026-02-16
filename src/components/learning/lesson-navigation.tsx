"use client";

import Link from "next/link";
import {
  Video,
  FileText,
  HelpCircle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Section, Lesson, LessonProgress } from "@/types/database";

type SectionWithLessons = Section & { lessons: Lesson[] };

const lessonTypeIcon = {
  video: Video,
  document: FileText,
  quiz: HelpCircle,
};

interface LessonNavigationProps {
  courseSlug: string;
  sections: SectionWithLessons[];
  currentLessonId: string;
  progressMap: Record<string, LessonProgress>;
}

export function LessonNavigation({
  courseSlug,
  sections,
  currentLessonId,
  progressMap,
}: LessonNavigationProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <nav className="space-y-1">
      {sections.map((section, sIndex) => {
        const sectionLessons = section.lessons ?? [];
        const completedInSection = sectionLessons.filter(
          (l) => progressMap[l.id]?.status === "completed"
        ).length;
        const totalInSection = sectionLessons.length;
        const sectionProgress =
          totalInSection > 0
            ? Math.round((completedInSection / totalInSection) * 100)
            : 0;

        return (
        <div key={section.id}>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 rounded-md transition-colors"
            onClick={() => toggleSection(section.id)}
          >
            {expandedSections.has(section.id) ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground mr-1">
                  {sIndex + 1}.
                </span>
                <span className="truncate">{section.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={sectionProgress} className="h-1 flex-1" />
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {completedInSection}/{totalInSection}
                </span>
              </div>
            </div>
          </button>

          {expandedSections.has(section.id) && section.lessons && (
            <div className="ml-2 space-y-0.5">
              {section.lessons.map((lesson) => {
                const LessonIcon = lessonTypeIcon[lesson.type];
                const isCurrent = lesson.id === currentLessonId;
                const progress = progressMap[lesson.id];
                const isCompleted = progress?.status === "completed";

                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${courseSlug}/learn/${lesson.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : isCurrent ? (
                      <Circle className="h-4 w-4 shrink-0 fill-primary text-primary" />
                    ) : (
                      <LessonIcon className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        );
      })}
    </nav>
  );
}
