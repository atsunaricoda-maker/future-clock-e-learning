import { getLearningSessionsForAdmin } from "@/lib/actions/learning-session";
import { LearningLogFilters } from "@/components/admin/learning-log-filters";
import { LearningLogTable } from "@/components/admin/learning-log-table";
import { LearningLogExportButtons } from "@/components/admin/learning-log-export-buttons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ClipboardCheck } from "lucide-react";

export default async function AdminLearningLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    reason?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { sessions, total } = await getLearningSessionsForAdmin({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    userName: params.q,
    logoutReason: params.reason,
    page,
  });

  const totalPages = Math.ceil(total / 20);

  // searchParamsをRecord<string, string>に変換
  const filterParams: Record<string, string> = {};
  if (params.dateFrom) filterParams.dateFrom = params.dateFrom;
  if (params.dateTo) filterParams.dateTo = params.dateTo;
  if (params.q) filterParams.q = params.q;
  if (params.reason) filterParams.reason = params.reason;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">学習ログ</h1>
          </div>
          <p className="text-muted-foreground">
            ユーザーのログイン/ログアウト時刻と学習時間を管理します（出勤簿突合用）
          </p>
        </div>
        <LearningLogExportButtons
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
        />
      </div>

      <LearningLogFilters />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total}件のセッション</span>
      </div>

      <LearningLogTable sessions={sessions} />

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        basePath="/admin/learning-logs"
        searchParams={filterParams}
      />
    </div>
  );
}
