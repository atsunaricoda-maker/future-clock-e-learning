"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  exportLearningLogsCsv,
  exportDailyLearningSummaryCsv,
} from "@/lib/actions/csv-export";

interface LearningLogExportButtonsProps {
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
}

export function LearningLogExportButtons({
  dateFrom,
  dateTo,
  companyId,
}: LearningLogExportButtonsProps) {
  const [isPending1, startTransition1] = useTransition();
  const [isPending2, startTransition2] = useTransition();

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDetail = () => {
    startTransition1(async () => {
      const { csv, error } = await exportLearningLogsCsv(
        dateFrom,
        dateTo,
        companyId
      );
      if (error) {
        toast.error(error);
        return;
      }
      const d = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `学習ログ詳細_${d}.csv`);
      toast.success("学習ログ（詳細）をエクスポートしました");
    });
  };

  const handleExportSummary = () => {
    startTransition2(async () => {
      const { csv, error } = await exportDailyLearningSummaryCsv(
        dateFrom,
        dateTo,
        companyId
      );
      if (error) {
        toast.error(error);
        return;
      }
      const d = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `学習ログ日別集計_${d}.csv`);
      toast.success("学習ログ（日別集計）をエクスポートしました");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportDetail}
        disabled={isPending1}
      >
        <Download className="mr-2 h-4 w-4" />
        {isPending1 ? "出力中..." : "詳細CSV"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportSummary}
        disabled={isPending2}
      >
        <Download className="mr-2 h-4 w-4" />
        {isPending2 ? "出力中..." : "日別集計CSV"}
      </Button>
    </div>
  );
}
