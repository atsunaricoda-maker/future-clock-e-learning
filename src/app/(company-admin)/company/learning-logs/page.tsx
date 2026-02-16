import { createClient } from "@/lib/supabase/server";
import { getLearningSessionsForAdmin } from "@/lib/actions/learning-session";
import { LearningLogFilters } from "@/components/admin/learning-log-filters";
import { LearningLogTable } from "@/components/admin/learning-log-table";
import { LearningLogExportButtons } from "@/components/admin/learning-log-export-buttons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ClipboardCheck } from "lucide-react";

export default async function CompanyLearningLogsPage({
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

  // 企業IDを取得
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  const companyId = profile?.company_id ?? undefined;

  const { sessions, total } = await getLearningSessionsForAdmin({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    userName: params.q,
    logoutReason: params.reason,
    companyId,
    page,
  });

  const totalPages = Math.ceil(total / 20);

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
            社員のログイン/ログアウト時刻と学習時間を確認できます
          </p>
        </div>
        <LearningLogExportButtons
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          companyId={companyId}
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
        basePath="/company/learning-logs"
        searchParams={filterParams}
      />
    </div>
  );
}
