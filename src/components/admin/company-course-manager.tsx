"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  assignCourseToCompany,
  unassignCourseFromCompany,
  updateCourseExpiration,
} from "@/lib/actions/company-course";

interface AssignedCourse {
  id: string;
  course_id: string;
  course_title: string;
  course_status: string;
  assigned_at: string;
  expires_at: string | null;
}

interface AvailableCourse {
  id: string;
  title: string;
}

interface CompanyCourseManagerProps {
  companyId: string;
  assignedCourses: AssignedCourse[];
  availableCourses: AvailableCourse[];
}

export function CompanyCourseManager({
  companyId,
  assignedCourses,
  availableCourses,
}: CompanyCourseManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [unassignTarget, setUnassignTarget] = useState<AssignedCourse | null>(null);
  const [expirationTarget, setExpirationTarget] = useState<AssignedCourse | null>(null);
  const [expirationDate, setExpirationDate] = useState("");

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleAssign = () => {
    if (selectedCourseIds.length === 0) return;
    startTransition(async () => {
      let successCount = 0;
      let errorMessage = "";
      for (const courseId of selectedCourseIds) {
        const result = await assignCourseToCompany(
          companyId,
          courseId,
          expiresAt || null
        );
        if (result.error) {
          errorMessage = result.error;
        } else {
          successCount++;
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount}件のコースを割り当てました`);
      }
      if (errorMessage) {
        toast.error(errorMessage);
      }
      setDialogOpen(false);
      setSelectedCourseIds([]);
      setExpiresAt("");
    });
  };

  const handleUnassign = () => {
    if (!unassignTarget) return;
    startTransition(async () => {
      const result = await unassignCourseFromCompany(unassignTarget.id, companyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("コースの割り当てを解除しました");
      }
      setUnassignTarget(null);
    });
  };

  const handleUpdateExpiration = () => {
    if (!expirationTarget) return;
    startTransition(async () => {
      const result = await updateCourseExpiration(
        expirationTarget.id,
        companyId,
        expirationDate || null
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("有効期限を更新しました");
      }
      setExpirationTarget(null);
      setExpirationDate("");
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const statusLabel: Record<string, string> = {
    published: "公開中",
    draft: "下書き",
    archived: "アーカイブ",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">割り当てコース</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableCourses.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              コースを割り当て
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>コースを割り当て</DialogTitle>
              <DialogDescription>
                この企業に割り当てるコースを選択してください
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-60 space-y-2 overflow-y-auto py-2">
              {availableCourses.map((course) => (
                <label
                  key={course.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedCourseIds.includes(course.id)}
                    onCheckedChange={() => handleToggleCourse(course.id)}
                  />
                  <span className="text-sm">{course.title}</span>
                </label>
              ))}
              {availableCourses.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  割り当て可能なコースがありません
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">有効期限（任意）</Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleAssign}
                disabled={selectedCourseIds.length === 0 || isPending}
              >
                {isPending
                  ? "割り当て中..."
                  : `${selectedCourseIds.length}件を割り当てる`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {assignedCourses.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          コースが割り当てられていません
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コース名</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>割り当て日</TableHead>
                <TableHead>有効期限</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    {course.course_title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        course.course_status === "published"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel[course.course_status] ?? course.course_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(course.assigned_at)}</TableCell>
                  <TableCell>
                    {course.expires_at ? (
                      <span
                        className={
                          isExpired(course.expires_at) ? "text-destructive" : ""
                        }
                      >
                        {formatDate(course.expires_at)}
                        {isExpired(course.expires_at) && "（期限切れ）"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">無期限</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setExpirationTarget(course);
                            setExpirationDate(course.expires_at?.split("T")[0] ?? "");
                          }}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          有効期限を変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setUnassignTarget(course)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          割り当て解除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Unassign confirmation dialog */}
      <AlertDialog
        open={!!unassignTarget}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>割り当てを解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{unassignTarget?.course_title}」の割り当てを解除します。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign} disabled={isPending}>
              {isPending ? "解除中..." : "解除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expiration edit dialog */}
      <Dialog
        open={!!expirationTarget}
        onOpenChange={(open) => {
          if (!open) {
            setExpirationTarget(null);
            setExpirationDate("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>有効期限を変更</DialogTitle>
            <DialogDescription>
              「{expirationTarget?.course_title}」の有効期限を設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-expires-at">有効期限</Label>
            <Input
              id="edit-expires-at"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              空にすると無期限になります
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateExpiration} disabled={isPending}>
              {isPending ? "更新中..." : "更新する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
