"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Globe, FileX, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteCourse, updateCourseStatus } from "@/lib/actions/course";
import { toast } from "sonner";

export function CourseActions({
  courseId,
  currentStatus,
}: {
  courseId: string;
  currentStatus: "draft" | "published" | "archived";
}) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (status: "draft" | "published" | "archived") => {
    setLoading(true);
    const result = await updateCourseStatus(courseId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("ステータスを更新しました");
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteCourse(courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("コースを削除しました");
      router.refresh();
    }
    setLoading(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/admin/courses/${courseId}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {currentStatus !== "published" && (
            <DropdownMenuItem onClick={() => handleStatusChange("published")}>
              <Globe className="mr-2 h-4 w-4" />
              公開する
            </DropdownMenuItem>
          )}
          {currentStatus !== "draft" && (
            <DropdownMenuItem onClick={() => handleStatusChange("draft")}>
              <FileX className="mr-2 h-4 w-4" />
              下書きに戻す
            </DropdownMenuItem>
          )}
          {currentStatus !== "archived" && (
            <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
              <Archive className="mr-2 h-4 w-4" />
              アーカイブ
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>コースを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。コースに関連するすべてのデータ（セクション、レッスン、受講データ）も削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
