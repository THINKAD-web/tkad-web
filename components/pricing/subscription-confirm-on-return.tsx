"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";

type Props = {
  isKo: boolean;
  onConfirmed?: () => void;
};

/** 토스 결제 복귀 시 구독 confirm — 플랜 위젯 마운트와 무관하게 1회 처리 */
function SubscriptionConfirmOnReturnInner({ isKo, onConfirmed }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    if (!paymentKey || !orderId || !amount) return;

    const lockKey = `tkad-sub-confirm:${orderId}`;
    try {
      if (sessionStorage.getItem(lockKey)) return;
      sessionStorage.setItem(lockKey, "1");
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      setConfirming(true);
      try {
        const res = await fetch("/api/subscriptions/confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });
        if (!res.ok) throw new Error("confirm_failed");
        onConfirmed?.();
        if (!cancelled) router.replace("/pricing?success=1");
      } catch {
        try {
          sessionStorage.removeItem(lockKey);
        } catch {
          /* ignore */
        }
        if (!cancelled) {
          setError(isKo ? "결제 확인 실패" : "Payment confirmation failed");
        }
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, isKo, onConfirmed]);

  if (!confirming && !error) return null;

  return (
    <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm dark:border-white/12 dark:bg-white/5 dark:text-white">
      {confirming ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {isKo ? "결제 확인 중…" : "Confirming payment…"}
        </>
      ) : (
        <span className="text-red-500">{error}</span>
      )}
    </div>
  );
}

export const SubscriptionConfirmOnReturn = withSearchParamsSuspense(
  SubscriptionConfirmOnReturnInner,
);
