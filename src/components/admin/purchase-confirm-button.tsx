"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmBankTransferPurchase } from "@/lib/actions/purchase";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

interface PurchaseConfirmButtonProps {
  purchaseId: string;
}

export function PurchaseConfirmButton({
  purchaseId,
}: PurchaseConfirmButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!confirm("この振込を確認済みにしますか？受講登録が自動的に行われます。"))
      return;

    setLoading(true);
    const result = await confirmBankTransferPurchase(purchaseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("振込を確認し、受講登録を完了しました");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Button size="sm" onClick={handleConfirm} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-1 h-3 w-3" />
      )}
      確認
    </Button>
  );
}
