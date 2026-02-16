"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

interface CertificateViewProps {
  userName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
}

export function CertificateView({
  userName,
  courseTitle,
  certificateNumber,
  issuedAt,
}: CertificateViewProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(issuedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");

      // A4 landscape
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      // Border
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.rect(10, 10, w - 20, h - 20);
      doc.rect(12, 12, w - 24, h - 24);

      // Top decoration line
      doc.setFillColor(59, 130, 246);
      doc.rect(w / 2 - 20, 22, 40, 1.5, "F");

      // "CERTIFICATE OF COMPLETION"
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("CERTIFICATE OF COMPLETION", w / 2, 32, { align: "center" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text("Certificate of Completion", w / 2, 52, { align: "center" });

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "This is to certify that the following person has completed the prescribed course.",
        w / 2,
        65,
        { align: "center" }
      );

      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text(userName, w / 2, 88, { align: "center" });

      // Underline for name
      const nameWidth = doc.getTextWidth(userName);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(w / 2 - nameWidth / 2 - 10, 92, w / 2 + nameWidth / 2 + 10, 92);

      // Course label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Course:", w / 2, 106, { align: "center" });

      // Course name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(courseTitle, w / 2, 116, { align: "center" });

      // Issue date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Issued: ${formattedDate}`, w / 2, 132, { align: "center" });

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(w / 2 - 30, 155, w / 2 + 30, 155);

      // Organization
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("FutureClock", w / 2, 163, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Reskilling Learning Platform", w / 2, 169, { align: "center" });

      // Certificate number
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`No. ${certificateNumber}`, w / 2, 180, { align: "center" });

      doc.save(`certificate-${certificateNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

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
          {/* Header decoration */}
          <div className="w-full">
            <div className="mx-auto mb-2 h-1 w-24 bg-primary/40" />
            <p className="text-sm tracking-[0.3em] text-muted-foreground">
              CERTIFICATE OF COMPLETION
            </p>
          </div>

          {/* Main content */}
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

          {/* Footer */}
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
