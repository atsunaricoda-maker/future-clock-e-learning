"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  parseCsvContent,
  bulkEnrollUsers,
  type BulkEnrollmentRow,
  type BulkEnrollmentResult,
} from "@/lib/actions/bulk-enrollment";

type Props = {
  companyId: string;
  availableCourses: { id: string; title: string }[];
};

export function BulkEnrollmentUploader({ companyId, availableCourses }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [parsedRows, setParsedRows] = useState<BulkEnrollmentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkEnrollmentResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple mode: select course + paste emails
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [emailsText, setEmailsText] = useState("");

  const resetState = () => {
    setStep("upload");
    setParsedRows([]);
    setParseErrors([]);
    setResult(null);
    setSelectedCourseId("");
    setEmailsText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { rows, errors } = await parseCsvContent(text);
    setParsedRows(rows);
    setParseErrors(errors);
    setStep("preview");
  };

  const handleSimpleMode = () => {
    if (!selectedCourseId) {
      toast.error("コースを選択してください");
      return;
    }
    const emails = emailsText
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    const rows: BulkEnrollmentRow[] = emails.map((email) => ({
      email,
      courseId: selectedCourseId,
    }));

    const errors: string[] = [];
    const validRows: BulkEnrollmentRow[] = [];
    for (const row of rows) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`無効なメールアドレス: ${row.email}`);
      } else {
        validRows.push(row);
      }
    }

    setParsedRows(validRows);
    setParseErrors(errors);
    setStep("preview");
  };

  const handleExecute = () => {
    if (parsedRows.length === 0) return;
    startTransition(async () => {
      const res = await bulkEnrollUsers(companyId, parsedRows);
      setResult(res);
      setStep("result");

      if (res.summary.success > 0) {
        toast.success(`${res.summary.success}件の登録が完了しました`);
      }
      if (res.summary.errors > 0) {
        toast.error(`${res.summary.errors}件の登録に失敗しました`);
      }
    });
  };

  const downloadTemplate = () => {
    const csv = "email,course_id\nexample@company.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_enrollment_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const courseNameMap = new Map(availableCourses.map((c) => [c.id, c.title]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">受講生一括登録</CardTitle>
            <CardDescription>
              CSVファイルまたはメールアドレス一覧でまとめて受講登録
            </CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetState();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                一括登録
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              {step === "upload" && (
                <>
                  <DialogHeader>
                    <DialogTitle>受講生一括登録</DialogTitle>
                    <DialogDescription>
                      CSVファイルをアップロードするか、メールアドレスを入力してください
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Simple mode */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">
                        方法1: コースを選んでメールアドレスを入力
                      </h4>
                      <Select
                        value={selectedCourseId}
                        onValueChange={setSelectedCourseId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="コースを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCourses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder={"メールアドレスを1行に1つ入力\nexample1@company.com\nexample2@company.com"}
                        value={emailsText}
                        onChange={(e) => setEmailsText(e.target.value)}
                      />
                      <Button onClick={handleSimpleMode} className="w-full">
                        プレビューへ進む
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          または
                        </span>
                      </div>
                    </div>

                    {/* CSV upload mode */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">
                        方法2: CSVファイルをアップロード
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadTemplate}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          テンプレートCSV
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          形式: email, course_id
                        </span>
                      </div>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
                        <FileSpreadsheet className="mb-2 h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          CSVファイルを選択
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          .csv ファイルをドロップまたは選択
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {step === "preview" && (
                <>
                  <DialogHeader>
                    <DialogTitle>登録内容の確認</DialogTitle>
                    <DialogDescription>
                      {parsedRows.length}件の登録を実行します
                    </DialogDescription>
                  </DialogHeader>

                  {parseErrors.length > 0 && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        {parseErrors.length}件の警告
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                        {parseErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedRows.length > 0 && (
                    <div className="max-h-[300px] overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>メールアドレス</TableHead>
                            <TableHead>コース</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">
                                {row.email}
                              </TableCell>
                              <TableCell className="text-sm">
                                {courseNameMap.get(row.courseId) ?? row.courseId}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={resetState}
                      disabled={isPending}
                    >
                      戻る
                    </Button>
                    <Button
                      onClick={handleExecute}
                      disabled={isPending || parsedRows.length === 0}
                    >
                      {isPending ? "登録中..." : `${parsedRows.length}件を登録する`}
                    </Button>
                  </DialogFooter>
                </>
              )}

              {step === "result" && result && (
                <>
                  <DialogHeader>
                    <DialogTitle>一括登録結果</DialogTitle>
                    <DialogDescription>
                      {result.summary.total}件中{result.summary.success}
                      件の登録が完了しました
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {result.summary.success}
                      </p>
                      <p className="text-xs text-muted-foreground">成功</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {result.summary.alreadyEnrolled}
                      </p>
                      <p className="text-xs text-muted-foreground">登録済み</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {result.summary.userNotFound}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ユーザー不明
                      </p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {result.summary.errors}
                      </p>
                      <p className="text-xs text-muted-foreground">エラー</p>
                    </div>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ステータス</TableHead>
                          <TableHead>メール</TableHead>
                          <TableHead>コース</TableHead>
                          <TableHead>メッセージ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.results.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              {row.status === "success" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : row.status === "already_enrolled" ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-yellow-200 bg-yellow-50 text-yellow-700"
                                >
                                  済
                                </Badge>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.email}
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[150px]">
                              {row.courseTitle}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setDialogOpen(false);
                        resetState();
                      }}
                    >
                      閉じる
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}
