"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { enrollInCourse } from "@/lib/actions/enrollment";
import { createBankTransferPurchase } from "@/lib/actions/purchase";
import { toast } from "sonner";
import {
  Loader2,
  BookOpen,
  PlayCircle,
  Lock,
  CreditCard,
  Building2,
  Clock,
} from "lucide-react";
import type { PurchaseStatus } from "@/types/database";

interface UnmetPrerequisite {
  id: string;
  title: string;
  slug: string;
}

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  isEnrolled: boolean;
  isLoggedIn: boolean;
  firstLessonId?: string | null;
  unmetPrerequisites?: UnmetPrerequisite[];
  price?: number;
  purchaseStatus?: PurchaseStatus | null;
}

export function EnrollButton({
  courseId,
  courseSlug,
  isEnrolled,
  isLoggedIn,
  firstLessonId,
  unmetPrerequisites = [],
  price = 0,
  purchaseStatus,
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  if (!isLoggedIn) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        <BookOpen className="mr-2 h-5 w-5" />
        ログインして受講する
      </Button>
    );
  }

  if (isEnrolled) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          if (firstLessonId) {
            router.push(`/courses/${courseSlug}/learn/${firstLessonId}`);
          } else {
            toast.info("レッスンがまだ追加されていません");
          }
        }}
      >
        <PlayCircle className="mr-2 h-5 w-5" />
        学習を続ける
      </Button>
    );
  }

  // Show prerequisites warning if not met
  if (unmetPrerequisites.length > 0) {
    return (
      <div className="space-y-3">
        <Button size="lg" className="w-full" disabled>
          <Lock className="mr-2 h-5 w-5" />
          前提条件未達
        </Button>
        <div className="rounded-md border border-yellow-200 bg-yellow-50/50 p-3">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            受講するには以下のコースを修了してください:
          </p>
          <ul className="space-y-1">
            {unmetPrerequisites.map((prereq) => (
              <li key={prereq.id}>
                <Link
                  href={`/courses/${prereq.slug}`}
                  className="text-sm text-primary hover:underline underline-offset-4"
                >
                  → {prereq.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Paid course: pending bank transfer
  if (price > 0 && purchaseStatus === "pending") {
    return (
      <div className="space-y-3">
        <Button size="lg" className="w-full" disabled>
          <Clock className="mr-2 h-5 w-5" />
          振込確認待ち
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          銀行振込の確認が完了次第、受講可能になります
        </p>
      </div>
    );
  }

  // Paid course: show purchase buttons
  if (price > 0) {
    const handleStripeCheckout = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        toast.error("決済の開始に失敗しました");
      }
      setLoading(false);
    };

    const handleBankTransfer = async () => {
      setBankLoading(true);
      const result = await createBankTransferPurchase(courseId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("銀行振込の申し込みを受け付けました");
        router.refresh();
      }
      setBankLoading(false);
    };

    return (
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={handleStripeCheckout}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-5 w-5" />
          )}
          {loading
            ? "処理中..."
            : `¥${price.toLocaleString()} で購入する`}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={handleBankTransfer}
          disabled={bankLoading}
        >
          {bankLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-5 w-5" />
          )}
          {bankLoading ? "処理中..." : "銀行振込で申し込む"}
        </Button>
      </div>
    );
  }

  // Free course: direct enrollment
  const handleEnroll = async () => {
    setLoading(true);
    const result = await enrollInCourse(courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("コースに登録しました！");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <BookOpen className="mr-2 h-5 w-5" />
      )}
      {loading ? "登録中..." : "受講登録する（無料）"}
    </Button>
  );
}
