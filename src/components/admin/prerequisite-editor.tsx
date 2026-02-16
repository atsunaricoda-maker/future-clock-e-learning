"use client";

import { useState } from "react";
import { updatePrerequisites } from "@/lib/actions/prerequisite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, X, Plus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CourseOption {
  id: string;
  title: string;
}

interface PrerequisiteEditorProps {
  courseId: string;
  allCourses: CourseOption[];
  currentPrerequisiteIds: string[];
}

export function PrerequisiteEditor({
  courseId,
  allCourses,
  currentPrerequisiteIds,
}: PrerequisiteEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentPrerequisiteIds);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Exclude this course from selectable list
  const availableCourses = allCourses.filter(
    (c) => c.id !== courseId && !selectedIds.includes(c.id)
  );

  const filteredAvailable = search
    ? availableCourses.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : availableCourses;

  const selectedCourses = allCourses.filter((c) => selectedIds.includes(c.id));

  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !==
    JSON.stringify([...currentPrerequisiteIds].sort());

  const handleAdd = (id: string) => {
    setSelectedIds((prev) => [...prev, id]);
  };

  const handleRemove = (id: string) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updatePrerequisites(courseId, selectedIds);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("前提条件を更新しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          前提条件コース
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currently selected prerequisites */}
        {selectedCourses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              このコースを受講するには、以下のコースの修了が必要です:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCourses.map((course) => (
                <Badge
                  key={course.id}
                  variant="secondary"
                  className="flex items-center gap-1 py-1 px-2"
                >
                  {course.title}
                  <button
                    type="button"
                    onClick={() => handleRemove(course.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            前提条件は設定されていません。誰でも受講登録できます。
          </p>
        )}

        {/* Search and add */}
        {availableCourses.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="コースを検索して追加..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && filteredAvailable.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {filteredAvailable.slice(0, 10).map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      handleAdd(course.id);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{course.title}</span>
                  </button>
                ))}
              </div>
            )}
            {search && filteredAvailable.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 px-3">
                該当するコースが見つかりません
              </p>
            )}
          </div>
        )}

        {/* Save button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  保存中...
                </>
              ) : (
                "前提条件を保存"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
