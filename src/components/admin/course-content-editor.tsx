"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionForm } from "@/components/admin/section-form";
import { LessonForm } from "@/components/admin/lesson-form";
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from "@/lib/actions/course";
import { toast } from "sonner";
import type { Section, Lesson } from "@/types/database";
import type { SectionFormValues, LessonFormValues } from "@/lib/validations/course";

type SectionWithLessons = Section & { lessons: Lesson[] };

const lessonTypeIcon = {
  video: Video,
  document: FileText,
  quiz: HelpCircle,
};

const lessonTypeLabel = {
  video: "動画",
  document: "ドキュメント",
  quiz: "クイズ",
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

// Sortable lesson row
function SortableLessonItem({
  lesson,
  courseId,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  courseId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const LessonIcon = lessonTypeIcon[lesson.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border p-3 bg-background"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LessonIcon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <span className="text-sm font-medium">{lesson.title}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs">
            {lessonTypeLabel[lesson.type]}
          </Badge>
          {lesson.is_preview && (
            <Badge variant="secondary" className="text-xs">
              <Eye className="mr-1 h-3 w-3" />
              プレビュー
            </Badge>
          )}
          {lesson.duration_seconds && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(lesson.duration_seconds)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {lesson.type === "quiz" && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link
              href={`/admin/courses/${courseId}/quiz/${lesson.id}`}
              title="クイズ設定"
            >
              <Settings className="h-3 w-3" />
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Sortable section card
function SortableSectionCard({
  section,
  sIndex,
  courseId,
  isExpanded,
  onToggle,
  onEditSection,
  onDeleteSection,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderLessons,
}: {
  section: SectionWithLessons;
  sIndex: number;
  courseId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onReorderLessons: (sectionId: string, orderedIds: string[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const lessonIds = section.lessons?.map((l) => l.id) ?? [];

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessonIds.indexOf(active.id as string);
    const newIndex = lessonIds.indexOf(over.id as string);
    const newOrder = arrayMove(lessonIds, oldIndex, newIndex);
    onReorderLessons(section.id, newOrder);
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            <button
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div
              className="flex flex-1 cursor-pointer items-center gap-2"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base">
                <span className="mr-2 text-muted-foreground">
                  セクション {sIndex + 1}
                </span>
                {section.title}
              </CardTitle>
              <Badge variant="secondary" className="ml-2">
                {section.lessons?.length || 0} レッスン
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onEditSection}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDeleteSection}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {section.lessons && section.lessons.length > 0 ? (
            <DndContext
              sensors={lessonSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext
                items={lessonIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {section.lessons.map((lesson) => (
                    <SortableLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      courseId={courseId}
                      onEdit={() => onEditLesson(lesson)}
                      onDelete={() => onDeleteLesson(lesson)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              レッスンがまだありません
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={onAddLesson}
          >
            <Plus className="mr-2 h-3 w-3" />
            レッスンを追加
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function CourseContentEditor({
  courseId,
  initialSections,
}: {
  courseId: string;
  initialSections: SectionWithLessons[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialSections.map((s) => s.id))
  );

  // Dialog state
  const [sectionDialog, setSectionDialog] = useState<{
    open: boolean;
    section?: Section;
  }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{
    open: boolean;
    sectionId: string;
    lesson?: Lesson;
  }>({ open: false, sectionId: "" });
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "section" | "lesson";
    id: string;
    name: string;
  } | null>(null);

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Section handlers
  const handleCreateSection = async (values: SectionFormValues) => {
    setLoading(true);
    const result = await createSection(courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("セクションを追加しました");
      setSectionDialog({ open: false });
      router.refresh();
    }
    setLoading(false);
  };

  const handleUpdateSection = async (values: SectionFormValues) => {
    if (!sectionDialog.section) return;
    setLoading(true);
    const result = await updateSection(sectionDialog.section.id, courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("セクションを更新しました");
      setSectionDialog({ open: false });
      router.refresh();
    }
    setLoading(false);
  };

  const handleDeleteSection = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteSection(deleteTarget.id, courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("削除しました");
      router.refresh();
    }
    setDeleteTarget(null);
    setLoading(false);
  };

  // Lesson handlers
  const handleCreateLesson = async (values: LessonFormValues) => {
    setLoading(true);
    const result = await createLesson(lessonDialog.sectionId, courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("レッスンを追加しました");
      setLessonDialog({ open: false, sectionId: "" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleUpdateLesson = async (values: LessonFormValues) => {
    if (!lessonDialog.lesson) return;
    setLoading(true);
    const result = await updateLesson(lessonDialog.lesson.id, courseId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("レッスンを更新しました");
      setLessonDialog({ open: false, sectionId: "" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleDeleteLesson = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteLesson(deleteTarget.id, courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("削除しました");
      router.refresh();
    }
    setDeleteTarget(null);
    setLoading(false);
  };

  // Section drag-and-drop
  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionIds = initialSections.map((s) => s.id);
    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);
    const newOrder = arrayMove(sectionIds, oldIndex, newIndex);

    await reorderSections(courseId, newOrder);
    router.refresh();
  };

  // Lesson drag-and-drop
  const handleReorderLessons = async (sectionId: string, orderedIds: string[]) => {
    await reorderLessons(sectionId, courseId, orderedIds);
    router.refresh();
  };

  const sectionIds = initialSections.map((s) => s.id);

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sectionSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sectionIds}
          strategy={verticalListSortingStrategy}
        >
          {initialSections.map((section, sIndex) => (
            <SortableSectionCard
              key={section.id}
              section={section}
              sIndex={sIndex}
              courseId={courseId}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onEditSection={() => setSectionDialog({ open: true, section })}
              onDeleteSection={() =>
                setDeleteTarget({
                  type: "section",
                  id: section.id,
                  name: section.title,
                })
              }
              onAddLesson={() =>
                setLessonDialog({ open: true, sectionId: section.id })
              }
              onEditLesson={(lesson) =>
                setLessonDialog({
                  open: true,
                  sectionId: section.id,
                  lesson,
                })
              }
              onDeleteLesson={(lesson) =>
                setDeleteTarget({
                  type: "lesson",
                  id: lesson.id,
                  name: lesson.title,
                })
              }
              onReorderLessons={handleReorderLessons}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setSectionDialog({ open: true })}
      >
        <Plus className="mr-2 h-4 w-4" />
        セクションを追加
      </Button>

      {/* Section Dialog */}
      <Dialog
        open={sectionDialog.open}
        onOpenChange={(open) => !open && setSectionDialog({ open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sectionDialog.section ? "セクションを編集" : "セクションを追加"}
            </DialogTitle>
          </DialogHeader>
          <SectionForm
            initialData={sectionDialog.section}
            onSubmit={sectionDialog.section ? handleUpdateSection : handleCreateSection}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog
        open={lessonDialog.open}
        onOpenChange={(open) =>
          !open && setLessonDialog({ open: false, sectionId: "" })
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lessonDialog.lesson ? "レッスンを編集" : "レッスンを追加"}
            </DialogTitle>
          </DialogHeader>
          <LessonForm
            initialData={lessonDialog.lesson}
            onSubmit={lessonDialog.lesson ? handleUpdateLesson : handleCreateLesson}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              「{deleteTarget?.name}」を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "section"
                ? "セクション内のすべてのレッスンも削除されます。この操作は取り消せません。"
                : "この操作は取り消せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                deleteTarget?.type === "section"
                  ? handleDeleteSection
                  : handleDeleteLesson
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
