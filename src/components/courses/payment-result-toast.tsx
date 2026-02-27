"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface PaymentResultToastProps {
  result: string;
}

export function PaymentResultToast({ result }: PaymentResultToastProps) {
  useEffect(() => {
    if (result === "success") {
      toast.success("購入が完了しました！受講を開始できます。");
    } else if (result === "cancel") {
      toast.info("決済がキャンセルされました");
    }
  }, [result]);

  return null;
}
