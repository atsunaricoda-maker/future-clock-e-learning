"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MyCourseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const currentSort = searchParams.get("sort") ?? "recent";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "recent") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentStatus}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="in_progress">受講中</SelectItem>
          <SelectItem value="completed">修了済み</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentSort}
        onValueChange={(v) => updateParam("sort", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="並び替え" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">登録日（新しい順）</SelectItem>
          <SelectItem value="oldest">登録日（古い順）</SelectItem>
          <SelectItem value="progress_desc">進捗（高い順）</SelectItem>
          <SelectItem value="progress_asc">進捗（低い順）</SelectItem>
          <SelectItem value="title">タイトル順</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
