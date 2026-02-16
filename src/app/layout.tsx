import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-jp";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FutureClock LMS - リスキリング講座",
  description: "株式会社FutureClockが提供するリスキリング講座のe-learningプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
