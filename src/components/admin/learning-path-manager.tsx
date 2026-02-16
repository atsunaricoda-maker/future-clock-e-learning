"use client";

import { useState } from "react";
import {
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  updateLearningPathCourses,
} from "@/lib/actions/learning-path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Search,
  X,
  Route,
} from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
}

interface LearningPathRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty_level: string | null;
  is_published: boolean;
  courses: { course_id: string; order_index: number; is_required: boolean; courses: { id: string; title: string } | null }[];
}

interface LearningPathManagerProps {
  learningPaths: LearningPathRow[];
  allCourses: CourseOption[];
}

export function LearningPathManager({
  learningPaths: initialPaths,
  allCourses,
}: LearningPathManagerProps) {
  const [paths, setPaths] = useState(initialPaths);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setDifficultyLevel("");
    setShowCreateForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    setLoading(true);
    try {
      const result = await createLearningPath({
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty_level: difficultyLevel || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("学習パスを作成しました");
        resetCreateForm();
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    const result = await updateLearningPath(id, { is_published: !currentPublished });
    if (result.error) {
      toast.error(result.error);
    } else {
      setPaths((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_published: !currentPublished } : p))
      );
      toast.success(currentPublished ? "非公開にしました" : "公開しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この学習パスを削除しますか？")) return;
    const result = await deleteLearningPath(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setPaths((prev) => prev.filter((p) => p.id !== id));
      toast.success("学習パスを削除しました");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規学習パス作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="学習パスのタイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="説明（任意）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="難易度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">初級</SelectItem>
                <SelectItem value="intermediate">中級</SelectItem>
                <SelectItem value="advanced">上級</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetCreateForm}>
                キャンセル
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "作成する"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規学習パス作成
        </Button>
      )}

      {/* Learning paths list */}
      {paths.length > 0 ? (
        <div className="space-y-4">
          {paths.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              allCourses={allCourses}
              isEditing={editingPathId === path.id}
              onStartEdit={() => setEditingPathId(path.id)}
              onStopEdit={() => setEditingPathId(null)}
              onTogglePublish={() => handleTogglePublish(path.id, path.is_published)}
              onDelete={() => handleDelete(path.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Route className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">学習パスがまだありません</h3>
            <p className="text-sm text-muted-foreground">
              最初の学習パスを作成しましょう
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual learning path card with inline course editor
function LearningPathCard({
  path,
  allCourses,
  isEditing,
  onStartEdit,
  onStopEdit,
  onTogglePublish,
  onDelete,
}: {
  path: LearningPathRow;
  allCourses: CourseOption[];
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const initialCourses = path.courses
    .filter((c) => c.courses)
    .sort((a, b) => a.order_index - b.order_index)
    .map((c) => ({
      courseId: c.courses!.id,
      title: c.courses!.title,
      isRequired: c.is_required,
    }));

  const [selectedCourses, setSelectedCourses] = useState(initialCourses);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedIds = new Set(selectedCourses.map((c) => c.courseId));
  const available = allCourses.filter((c) => !selectedIds.has(c.id));
  const filtered = search
    ? available.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : available;

  const hasChanges =
    JSON.stringify(selectedCourses.map((c) => c.courseId)) !==
    JSON.stringify(initialCourses.map((c) => c.courseId));

  const handleAddCourse = (courseId: string, courseTitle: string) => {
    setSelectedCourses((prev) => [
      ...prev,
      { courseId, title: courseTitle, isRequired: true },
    ]);
    setSearch("");
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.courseId !== courseId));
  };

  const handleMoveCourse = (index: number, direction: "up" | "down") => {
    const newArr = [...selectedCourses];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newArr.length) return;
    [newArr[index], newArr[swapIdx]] = [newArr[swapIdx], newArr[index]];
    setSelectedCourses(newArr);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateLearningPathCourses(
        path.id,
        selectedCourses.map((c, i) => ({
          courseId: c.courseId,
          orderIndex: i,
          isRequired: c.isRequired,
        }))
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("コース構成を保存しました");
        onStopEdit();
      }
    } finally {
      setSaving(false);
    }
  };

  const difficultyLabel: Record<string, string> = {
    beginner: "初級",
    intermediate: "中級",
    advanced: "上級",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{path.title}</CardTitle>
            {path.difficulty_level && (
              <Badge variant="outline" className="text-xs">
                {difficultyLabel[path.difficulty_level] ?? path.difficulty_level}
              </Badge>
            )}
            <Badge variant={path.is_published ? "default" : "secondary"}>
              {path.is_published ? "公開中" : "下書き"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onTogglePublish}>
              {path.is_published ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {path.description && (
          <p className="text-sm text-muted-foreground">{path.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Course list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              コース構成（{selectedCourses.length}コース）
            </p>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={onStartEdit}>
                編集
              </Button>
            )}
          </div>

          {selectedCourses.length > 0 ? (
            <div className="space-y-1.5">
              {selectedCourses.map((course, index) => (
                <div
                  key={course.courseId}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{course.title}</span>
                  {isEditing && (
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveCourse(index, "up")}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          ↑
                        </button>
                      )}
                      {index < selectedCourses.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveCourse(index, "down")}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(course.courseId)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              コースが追加されていません
            </p>
          )}

          {/* Add course search */}
          {isEditing && available.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="コースを検索して追加..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {search && filtered.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {filtered.slice(0, 10).map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleAddCourse(course.id, course.title)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{course.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save/Cancel buttons */}
          {isEditing && (
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={onStopEdit}>
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "コース構成を保存"
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
