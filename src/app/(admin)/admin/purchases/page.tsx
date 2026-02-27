import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PurchaseConfirmButton } from "@/components/admin/purchase-confirm-button";
import { CreditCard } from "lucide-react";

const PER_PAGE = 20;

const statusLabel: Record<string, string> = {
  pending: "確認待ち",
  completed: "完了",
  failed: "失敗",
  refunded: "返金済み",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  completed: "default",
  failed: "destructive",
  refunded: "secondary",
};

const methodLabel: Record<string, string> = {
  stripe: "カード決済",
  bank_transfer: "銀行振込",
};

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { status, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("purchases")
    .select("*, users(full_name, email), courses(title, slug)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const from = (currentPage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  query = query.range(from, to);

  const { data: purchases, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  const filterParams: Record<string, string> = {};
  if (status) filterParams.status = status;

  type PurchaseRow = {
    id: string;
    user_id: string;
    course_id: string;
    amount: number;
    status: string;
    payment_method: string;
    admin_note: string | null;
    created_at: string;
    users: { full_name: string; email: string } | null;
    courses: { title: string; slug: string } | null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">購入管理</h1>
        <p className="text-muted-foreground">
          コース購入の一覧と銀行振込の確認を行います
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        <a
          href="/admin/purchases"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !status ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          すべて
        </a>
        {["pending", "completed", "failed", "refunded"].map((s) => (
          <a
            key={s}
            href={`/admin/purchases?status=${s}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              status === s ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {statusLabel[s]}
          </a>
        ))}
      </div>

      {purchases && purchases.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>コース</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>決済方法</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>申込日</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(purchases as unknown as PurchaseRow[]).map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {purchase.users?.full_name ?? "不明"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {purchase.users?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{purchase.courses?.title ?? "不明"}</TableCell>
                    <TableCell>¥{purchase.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {methodLabel[purchase.payment_method] ??
                        purchase.payment_method}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[purchase.status] ?? "outline"}>
                        {statusLabel[purchase.status] ?? purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleDateString(
                        "ja-JP"
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.status === "pending" &&
                        purchase.payment_method === "bank_transfer" && (
                          <PurchaseConfirmButton purchaseId={purchase.id} />
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/purchases"
            searchParams={filterParams}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            {status
              ? "条件に一致する購入がありません"
              : "購入履歴がまだありません"}
          </h3>
        </div>
      )}
    </div>
  );
}
