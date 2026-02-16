"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LearningLogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [userName, setUserName] = useState(searchParams.get("q") ?? "");
  const [logoutReason, setLogoutReason] = useState(
    searchParams.get("reason") ?? "all"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (userName) params.set("q", userName);
      if (logoutReason && logoutReason !== "all")
        params.set("reason", logoutReason);
      params.set("page", "1");

      const qs = params.toString();
      router.push(qs ? `?${qs}` : "?");
    }, 400);

    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, userName, logoutReason, router]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="dateFrom" className="text-xs">
          開始日
        </Label>
        <Input
          id="dateFrom"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dateTo" className="text-xs">
          終了日
        </Label>
        <Input
          id="dateTo"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5 flex-1 min-w-48">
        <Label htmlFor="userName" className="text-xs">
          ユーザー検索
        </Label>
        <Input
          id="userName"
          type="text"
          placeholder="氏名・メールで検索..."
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ログアウト理由</Label>
        <Select value={logoutReason} onValueChange={setLogoutReason}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="manual">手動ログアウト</SelectItem>
            <SelectItem value="browser_close">ブラウザ閉じ</SelectItem>
            <SelectItem value="inactivity">非活動</SelectItem>
            <SelectItem value="session_expired">セッション期限切れ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
