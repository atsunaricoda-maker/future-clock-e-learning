"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "初級" },
  { value: "intermediate", label: "中級" },
  { value: "advanced", label: "上級" },
];

interface CourseFiltersProps {
  categories?: { id: string; name: string }[];
}

export function CourseFilters({ categories = [] }: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentDifficulty = searchParams.get("difficulty") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/courses?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="コースを検索..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const value = e.target.value;
            const timeout = setTimeout(() => updateParams("q", value), 400);
            return () => clearTimeout(timeout);
          }}
          className="pl-9"
        />
      </div>
      <Select
        value={currentCategory || "all"}
        onValueChange={(value) => updateParams("category", value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="カテゴリ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのカテゴリ</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.name}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentDifficulty || "all"}
        onValueChange={(value) => updateParams("difficulty", value)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="難易度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての難易度</SelectItem>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentTag && (
        <div className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">タグ:</span>
          <span>{currentTag}</span>
          <button
            className="ml-1 text-muted-foreground hover:text-foreground"
            onClick={() => updateParams("tag", "")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
