import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyActions } from "@/components/admin/company-actions";
import { AdminCompanyFilters } from "@/components/admin/admin-company-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Plus, Building2 } from "lucide-react";
import { sanitizeFilterInput } from "@/lib/sanitize";

const PER_PAGE = 20;

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { q, status, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    const sq = sanitizeFilterInput(q);
    query = query.or(`name.ilike.%${sq}%,slug.ilike.%${sq}%`);
  }
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (currentPage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  query = query.range(from, to);

  const { data: companies, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Fetch user counts per company
  const { data: userCounts } = await supabase
    .from("users")
    .select("company_id")
    .not("company_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const u of userCounts || []) {
    if (u.company_id) {
      countMap[u.company_id] = (countMap[u.company_id] || 0) + 1;
    }
  }

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (status) filterParams.status = status;

  const hasFilters = !!(q || status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">企業管理</h1>
          <p className="text-muted-foreground">
            企業の作成・編集・ステータス管理を行います
          </p>
        </div>
        <Link href="/admin/companies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <AdminCompanyFilters />
      </Suspense>

      {companies && companies.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">企業名</TableHead>
                  <TableHead>プラン</TableHead>
                  <TableHead>ユーザー数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {company.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.plan_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {countMap[company.id] || 0} / {company.max_users}
                    </TableCell>
                    <TableCell>
                      {company.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          有効
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-700"
                        >
                          無効
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <CompanyActions
                        companyId={company.id}
                        isActive={company.is_active}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/companies"
            searchParams={filterParams}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            {hasFilters ? "条件に一致する企業がありません" : "企業がまだありません"}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {hasFilters ? "検索条件を変更してみてください" : "最初の企業を登録しましょう"}
          </p>
          {!hasFilters && (
            <Link href="/admin/companies/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                企業を作成
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
