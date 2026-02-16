"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { updateUserRole, updateUserStatus, deleteUser } from "@/lib/actions/user";
import { toast } from "sonner";
import type { UserRole } from "@/types/database";

interface UserActionsProps {
  userId: string;
  currentRole: UserRole;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, currentRole, isActive, isSelf }: UserActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (role: UserRole) => {
    setLoading(true);
    const result = await updateUserRole(userId, role);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("ロールを更新しました");
      router.refresh();
    }
    setLoading(false);
  };

  const handleStatusToggle = async () => {
    setLoading(true);
    const result = await updateUserStatus(userId, !isActive);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isActive ? "ユーザーを無効化しました" : "ユーザーを有効化しました");
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteUser(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("ユーザーを削除しました");
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isSelf}>
              <Shield className="mr-2 h-4 w-4" />
              ロール変更
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleRoleChange("admin")}
                disabled={currentRole === "admin"}
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-red-600" />
                管理者
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("company_admin")}
                disabled={currentRole === "company_admin"}
              >
                <Shield className="mr-2 h-4 w-4 text-blue-600" />
                企業管理者
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("student")}
                disabled={currentRole === "student"}
              >
                <User className="mr-2 h-4 w-4" />
                受講生
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={handleStatusToggle}
            disabled={isSelf && isActive}
          >
            {isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                無効化する
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                有効化する
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
            disabled={isSelf}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ユーザーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。ユーザーに関連するすべてのデータ（受講履歴、進捗データ）も削除されます。
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
