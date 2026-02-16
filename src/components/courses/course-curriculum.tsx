"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Lock,
  Eye,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Section, Lesson } from "@/types/database";

type SectionWithLessons = Section & { lessons: Lesson[] };

const lessonTypeIcon = {
  video: Video,
  document: FileText,
  quiz: HelpCircle,
};

interface CourseCurriculumProps {
  sections: SectionWithLessons[];
  isEnrolled: boolean;
}

export function CourseCurriculum({ sections, isEnrolled }: CourseCurriculumProps) {
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const totalLessons = sections.reduce(
    (acc, s) => acc + (s.lessons?.length || 0),
    0
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">カリキュラム</h2>
        <p className="text-sm text-muted-foreground">
          {sections.length}セクション / {totalLessons}レッスン
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section, sIndex) => (
          <div key={section.id} className="rounded-lg border">
            {/* Section header */}
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              {expandedSections.has(section.id) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-sm font-medium">
                  <span className="text-muted-foreground mr-2">
                    セクション {sIndex + 1}
                  </span>
                  {section.title}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {section.lessons?.length || 0} レッスン
              </Badge>
            </button>

            {/* Lessons */}
            {expandedSections.has(section.id) && section.lessons && (
              <div className="border-t">
                {section.lessons.map((lesson) => {
                  const LessonIcon = lessonTypeIcon[lesson.type];
                  const canView = isEnrolled || lesson.is_preview;
                  const duration = formatDuration(lesson.duration_seconds);

                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm border-b last:border-b-0"
                    >
                      <LessonIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span
                        className={`flex-1 ${!canView ? "text-muted-foreground" : ""}`}
                      >
                        {lesson.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {lesson.is_preview && !isEnrolled && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="mr-1 h-3 w-3" />
                            プレビュー
                          </Badge>
                        )}
                        {duration && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {duration}
                          </span>
                        )}
                        {!canView && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
