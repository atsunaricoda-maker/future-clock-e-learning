"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SessionRow {
  id: string;
  user_name: string;
  user_email: string;
  login_at: string;
  logout_at: string | null;
  duration_minutes: number | null;
  logout_reason: string | null;
  is_active: boolean;
  activity_count: number;
}

const logoutReasonLabels: Record<string, string> = {
  manual: "手動ログアウト",
  browser_close: "ブラウザ閉じ",
  inactivity: "非活動",
  session_expired: "セッション期限切れ",
};

const logoutReasonColors: Record<string, string> = {
  manual: "border-green-200 bg-green-50 text-green-700",
  browser_close: "border-yellow-200 bg-yellow-50 text-yellow-700",
  inactivity: "border-orange-200 bg-orange-50 text-orange-700",
  session_expired: "border-red-200 bg-red-50 text-red-700",
};

function formatJSTTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function formatJSTDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

interface LearningLogTableProps {
  sessions: SessionRow[];
}

export function LearningLogTable({ sessions }: LearningLogTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        該当する学習ログはありません
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ユーザー</TableHead>
            <TableHead>日付</TableHead>
            <TableHead>ログイン</TableHead>
            <TableHead>ログアウト</TableHead>
            <TableHead>学習時間</TableHead>
            <TableHead>理由</TableHead>
            <TableHead className="text-right">操作回数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{s.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.user_email}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {formatJSTDate(s.login_at)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatJSTTime(s.login_at)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {s.is_active ? (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  >
                    学習中
                  </Badge>
                ) : s.logout_at ? (
                  formatJSTTime(s.logout_at)
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-sm">
                {s.is_active ? (
                  <span className="text-muted-foreground">-</span>
                ) : (
                  formatDuration(s.duration_minutes)
                )}
              </TableCell>
              <TableCell>
                {s.logout_reason ? (
                  <Badge
                    variant="outline"
                    className={
                      logoutReasonColors[s.logout_reason] ?? ""
                    }
                  >
                    {logoutReasonLabels[s.logout_reason] ??
                      s.logout_reason}
                  </Badge>
                ) : s.is_active ? (
                  <span className="text-xs text-muted-foreground">-</span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {s.activity_count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
