"use client";

import { useState } from "react";
import { exportUsersCsv, exportEnrollmentsCsv, exportCompanyReportCsv } from "@/lib/actions/csv-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Users, GraduationCap, Building2 } from "lucide-react";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CsvExportButtons() {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleExport = async (
    type: "users" | "enrollments" | "companies"
  ) => {
    setLoadingType(type);
    try {
      let result: { csv: string; error: string | null };
      let filename: string;

      switch (type) {
        case "users":
          result = await exportUsersCsv();
          filename = `users_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case "enrollments":
          result = await exportEnrollmentsCsv();
          filename = `enrollments_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case "companies":
          result = await exportCompanyReportCsv();
          filename = `company_report_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
      }

      if (result.error) {
        toast.error(result.error);
        return;
      }

      downloadCsv(result.csv, filename);
      toast.success("CSVをダウンロードしました");
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-4 w-4" />
          CSVエクスポート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport("users")}
            disabled={!!loadingType}
          >
            <Users className="mr-2 h-4 w-4" />
            {loadingType === "users" ? "エクスポート中..." : "ユーザー一覧"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("enrollments")}
            disabled={!!loadingType}
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            {loadingType === "enrollments" ? "エクスポート中..." : "受講状況"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("companies")}
            disabled={!!loadingType}
          >
            <Building2 className="mr-2 h-4 w-4" />
            {loadingType === "companies" ? "エクスポート中..." : "企業別レポート"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
