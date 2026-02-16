"use client";

import { useState } from "react";
import { getInactiveEnrollments, sendBulkReminders } from "@/lib/actions/reminder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Bell, Mail, Search, Send } from "lucide-react";

interface InactiveItem {
  userId: string;
  email: string;
  fullName: string;
  courseTitle: string;
  progressPercentage: number;
  enrolledAt: string;
}

export function ReminderManager() {
  const [daysInactive, setDaysInactive] = useState(7);
  const [items, setItems] = useState<InactiveItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const result = await getInactiveEnrollments(daysInactive);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems(result.data);
      setSelected(new Set(result.data.map((_, i) => i)));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((_, i) => i)));
    }
  };

  const handleSend = async () => {
    const targets = items
      .filter((_, i) => selected.has(i))
      .map((item) => ({
        email: item.email,
        userName: item.fullName,
        courseTitle: item.courseTitle,
        progressPercentage: item.progressPercentage,
      }));

    if (targets.length === 0) {
      toast.error("送信対象を選択してください");
      return;
    }

    setSending(true);
    try {
      const result = await sendBulkReminders(targets);
      toast.success(`${result.sent}件のリマインドメールを送信しました`);
      if (result.errors > 0) {
        toast.error(`${result.errors}件の送信に失敗しました`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          学習リマインダー送信
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label>未学習期間（日数）</Label>
            <Input
              type="number"
              min={1}
              value={daysInactive}
              onChange={(e) => setDaysInactive(Number(e.target.value) || 7)}
              className="w-32"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} variant="outline">
            <Search className="mr-1 h-4 w-4" />
            {loading ? "検索中..." : "対象者を検索"}
          </Button>
        </div>

        {searched && items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            該当する受講生はいません
          </p>
        )}

        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.size === items.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selected.size}/{items.length}件 選択中
                </span>
              </div>
              <Button onClick={handleSend} disabled={sending || selected.size === 0} size="sm">
                <Send className="mr-1 h-4 w-4" />
                {sending ? "送信中..." : `${selected.size}件にリマインド送信`}
              </Button>
            </div>

            <div className="max-h-96 space-y-1 overflow-y-auto">
              {items.map((item, i) => (
                <label
                  key={`${item.userId}-${item.courseTitle}-${i}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.has(i)}
                    onCheckedChange={() => toggleItem(i)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{item.fullName}</span>
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{item.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.courseTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Progress value={item.progressPercentage} className="h-2 w-20" />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {item.progressPercentage}%
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
