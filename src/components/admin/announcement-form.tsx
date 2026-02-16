"use client";

import { useState } from "react";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/actions/announcement";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Megaphone,
  Trash2,
  Pin,
  Eye,
  EyeOff,
} from "lucide-react";

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  type: string;
  target: string;
  target_company_id: string | null;
  target_course_id: string | null;
  is_active: boolean;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface AnnouncementManagerProps {
  announcements: AnnouncementRow[];
  companies: CompanyOption[];
}

const typeLabels: Record<string, string> = {
  info: "お知らせ",
  warning: "注意",
  success: "お祝い",
  maintenance: "メンテナンス",
};

const typeColors: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
  success: "border-green-200 bg-green-50 text-green-700",
  maintenance: "border-red-200 bg-red-50 text-red-700",
};

const targetLabels: Record<string, string> = {
  all: "全員",
  students: "受講生のみ",
  company_admins: "企業管理者のみ",
};

export function AnnouncementManager({
  announcements: initialAnnouncements,
  companies,
}: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("info");
  const [target, setTarget] = useState<string>("all");
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setType("info");
    setTarget("all");
    setTargetCompanyId("");
    setIsPinned(false);
    setExpiresAt("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("タイトルと内容を入力してください");
      return;
    }
    setLoading(true);
    try {
      const result = await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type: type as "info" | "warning" | "success" | "maintenance",
        target: target as "all" | "students" | "company_admins",
        target_company_id: targetCompanyId || null,
        is_pinned: isPinned,
        expires_at: expiresAt || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("お知らせを作成しました");
        resetForm();
        // Refresh page to get updated list
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const result = await updateAnnouncement(id, { is_active: !currentActive });
    if (result.error) {
      toast.error(result.error);
    } else {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !currentActive } : a))
      );
      toast.success(currentActive ? "非公開にしました" : "公開しました");
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    const result = await updateAnnouncement(id, { is_pinned: !currentPinned });
    if (result.error) {
      toast.error(result.error);
    } else {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_pinned: !currentPinned } : a))
      );
      toast.success(currentPinned ? "ピン留めを解除しました" : "ピン留めしました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお知らせを削除しますか？")) return;
    const result = await deleteAnnouncement(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("お知らせを削除しました");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規お知らせ作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="お知らせの内容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">種類</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">お知らせ</SelectItem>
                    <SelectItem value="warning">注意</SelectItem>
                    <SelectItem value="success">お祝い</SelectItem>
                    <SelectItem value="maintenance">メンテナンス</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">対象</label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員</SelectItem>
                    <SelectItem value="students">受講生のみ</SelectItem>
                    <SelectItem value="company_admins">企業管理者のみ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">有効期限</label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {companies.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  特定企業向け（任意）
                </label>
                <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              ピン留め（常に上部に表示）
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
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
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規お知らせ作成
        </Button>
      )}

      {/* Announcement list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            お知らせ一覧（{announcements.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">タイトル</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>公開日</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {a.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeColors[a.type] || ""}>
                        {typeLabels[a.type] || a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {targetLabels[a.target] || a.target}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? "default" : "secondary"}>
                        {a.is_active ? "公開中" : "非公開"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(a.published_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggleActive(a.id, a.is_active)}
                          title={a.is_active ? "非公開にする" : "公開する"}
                        >
                          {a.is_active ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleTogglePin(a.id, a.is_pinned)}
                          title={a.is_pinned ? "ピン留め解除" : "ピン留め"}
                        >
                          <Pin className={`h-3.5 w-3.5 ${a.is_pinned ? "text-primary" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(a.id)}
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              お知らせはまだありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
