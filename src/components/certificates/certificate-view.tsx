"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

interface CertificateViewProps {
  userName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  variant?: "simple" | "formal";
  trainingStartDate?: string | null;
  trainingEndDate?: string | null;
  totalLearningMinutes?: number | null;
  organizationName?: string;
  representativeName?: string;
  organizationAddress?: string;
}

function formatJaDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatLearningTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}時間${mins}分`;
  if (hours > 0) return `${hours}時間`;
  return `${mins}分`;
}

export function CertificateView({
  userName,
  courseTitle,
  certificateNumber,
  issuedAt,
  variant = "simple",
  trainingStartDate,
  trainingEndDate,
  totalLearningMinutes,
  organizationName = "FutureClock",
  representativeName,
  organizationAddress,
}: CertificateViewProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = formatJaDate(issuedAt);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      if (variant === "formal") {
        // html2canvas でHTML→画像→PDF（日本語対応）
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");

        if (!certificateRef.current) return;

        const canvas = await html2canvas(certificateRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");

        // A4 portrait
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();

        // キャンバスのアスペクト比に合わせてフィット
        const imgRatio = canvas.width / canvas.height;
        const pageRatio = w / h;
        let imgW = w;
        let imgH = h;
        if (imgRatio > pageRatio) {
          imgH = w / imgRatio;
        } else {
          imgW = h * imgRatio;
        }
        const offsetX = (w - imgW) / 2;
        const offsetY = (h - imgH) / 2;

        doc.addImage(imgData, "PNG", offsetX, offsetY, imgW, imgH);
        doc.save(`certificate-formal-${certificateNumber}.pdf`);
      } else {
        // 既存のシンプル証明書（jsPDF直接描画）
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const w = doc.internal.pageSize.getWidth();

        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(1);
        doc.rect(10, 10, w - 20, doc.internal.pageSize.getHeight() - 20);
        doc.rect(12, 12, w - 24, doc.internal.pageSize.getHeight() - 24);

        doc.setFillColor(59, 130, 246);
        doc.rect(w / 2 - 20, 22, 40, 1.5, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text("CERTIFICATE OF COMPLETION", w / 2, 32, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Certificate of Completion", w / 2, 52, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("This is to certify that the following person has completed the prescribed course.", w / 2, 65, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 30, 30);
        doc.text(userName, w / 2, 88, { align: "center" });

        const nameWidth = doc.getTextWidth(userName);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(w / 2 - nameWidth / 2 - 10, 92, w / 2 + nameWidth / 2 + 10, 92);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text("Course:", w / 2, 106, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text(courseTitle, w / 2, 116, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Issued: ${formattedDate}`, w / 2, 132, { align: "center" });

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(w / 2 - 30, 155, w / 2 + 30, 155);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text("FutureClock", w / 2, 163, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Reskilling Learning Platform", w / 2, 169, { align: "center" });

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`No. ${certificateNumber}`, w / 2, 180, { align: "center" });

        doc.save(`certificate-${certificateNumber}.pdf`);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (variant === "formal") {
    return (
      <div>
        <div className="mb-6 flex justify-end gap-2 print:hidden">
          <Button onClick={handleDownloadPdf} variant="outline" disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            PDF保存
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            印刷する
          </Button>
        </div>

        {/* 教育訓練修了証明書 — A4縦レイアウト */}
        <div
          ref={certificateRef}
          className="mx-auto max-w-2xl rounded-lg border-2 border-foreground/20 bg-white p-10 sm:p-14 print:max-w-none print:rounded-none print:border-foreground/40"
          style={{ aspectRatio: "1 / 1.414" }}
        >
          <div className="flex h-full flex-col justify-between text-center">
            {/* ヘッダー */}
            <div className="space-y-6">
              <div>
                <div className="mx-auto mb-3 h-0.5 w-32 bg-foreground/30" />
                <h1 className="text-2xl font-bold tracking-widest sm:text-3xl">
                  教育訓練修了証明書
                </h1>
                <div className="mx-auto mt-3 h-0.5 w-32 bg-foreground/30" />
              </div>

              <p className="text-sm text-muted-foreground">
                下記の者が教育訓練を修了したことを証明する
              </p>
            </div>

            {/* 本文 */}
            <div className="space-y-8 py-6">
              {/* 受講者名 */}
              <div>
                <p className="mb-1 text-xs text-muted-foreground">受講者名</p>
                <p className="text-2xl font-semibold sm:text-3xl">{userName}</p>
                <div className="mx-auto mt-2 h-px w-56 bg-foreground/20" />
              </div>

              {/* 講座名 */}
              <div>
                <p className="mb-1 text-xs text-muted-foreground">教育訓練講座名</p>
                <p className="text-lg font-medium sm:text-xl">{courseTitle}</p>
              </div>

              {/* 受講期間・総受講時間 */}
              <div className="mx-auto grid max-w-sm gap-4 text-left sm:grid-cols-2">
                <div className="rounded-md border border-foreground/10 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">受講期間</p>
                  <p className="text-sm font-medium">
                    {trainingStartDate ? formatJaDate(trainingStartDate) : "—"}
                    <br />
                    〜 {trainingEndDate ? formatJaDate(trainingEndDate) : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-foreground/10 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">総受講時間</p>
                  <p className="text-sm font-medium">
                    {totalLearningMinutes
                      ? formatLearningTime(totalLearningMinutes)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* 発行日・証明書番号 */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  発行日: {formattedDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  証明書番号: {certificateNumber}
                </p>
              </div>
            </div>

            {/* 教育訓練施設情報（右寄せ） */}
            <div className="space-y-4">
              <div className="mx-auto h-px w-full max-w-md bg-foreground/10" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">教育訓練施設</p>
                <p className="mt-1 text-base font-semibold">{organizationName}</p>
                {representativeName && (
                  <p className="text-sm">{representativeName}</p>
                )}
                {organizationAddress && (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                    {organizationAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // シンプル修了証（既存）
  return (
    <div>
      <div className="mb-6 flex justify-end gap-2 print:hidden">
        <Button onClick={handleDownloadPdf} variant="outline" disabled={downloading}>
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          PDF保存
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>

      <div
        ref={certificateRef}
        className="mx-auto aspect-[1.414/1] max-w-3xl rounded-lg border-4 border-double border-primary/30 bg-white p-8 sm:p-12 print:border-primary/50 print:max-w-none print:rounded-none"
      >
        <div className="flex h-full flex-col items-center justify-between text-center">
          <div className="w-full">
            <div className="mx-auto mb-2 h-1 w-24 bg-primary/40" />
            <p className="text-sm tracking-[0.3em] text-muted-foreground">
              CERTIFICATE OF COMPLETION
            </p>
          </div>

          <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-wide sm:text-4xl">
              修了証明書
            </h1>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                以下の者が所定の課程を修了したことを証明する
              </p>
            </div>

            <div className="py-4">
              <p className="text-2xl font-semibold sm:text-3xl">{userName}</p>
              <div className="mx-auto mt-2 h-px w-48 bg-foreground/20" />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">コース名</p>
              <p className="text-lg font-medium sm:text-xl">{courseTitle}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                発行日: {formattedDate}
              </p>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="mx-auto w-48">
              <div className="h-px bg-foreground/20" />
              <p className="mt-2 text-sm font-medium">FutureClock</p>
              <p className="text-xs text-muted-foreground">
                リスキリング講座プラットフォーム
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              証明書番号: {certificateNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
