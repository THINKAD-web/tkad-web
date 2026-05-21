"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { ANONYMOUS, loadPaymentWidget } from "@tosspayments/payment-widget-sdk";
import { Loader2 } from "lucide-react";
import {
  getTossClientKey,
  isTossPaymentsConfigured,
} from "@/lib/toss-payments-client";
import { PRO_MONTHLY_KRW } from "@/lib/report-pricing-constants";

type Props = {
  isKo: boolean;
  customerName: string;
  customerEmail: string;
};

export function ProSubscriptionCheckout({ isKo, customerName, customerEmail }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const widgetRef = useRef<Awaited<ReturnType<typeof loadPaymentWidget>> | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientKey = getTossClientKey();
  const configured = isTossPaymentsConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json()) as {
          data?: { orderId: string; amount: number };
          error?: string;
        };
        if (!res.ok || !data.data?.orderId) {
          throw new Error(data.error ?? "checkout_failed");
        }
        if (cancelled) return;
        setOrderId(data.data.orderId);

        const widget = await loadPaymentWidget(clientKey!, ANONYMOUS);
        if (cancelled) return;
        await widget.renderPaymentMethods("#pro-payment-method", {
          value: PRO_MONTHLY_KRW,
        });
        await widget.renderAgreement("#pro-agreement");
        widgetRef.current = widget;
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "widget_error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientKey, configured]);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const returnedOrderId = searchParams.get("orderId");
    const returnedAmount = searchParams.get("amount");
    if (!paymentKey || !returnedOrderId || !returnedAmount) return;

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
            orderId: returnedOrderId,
            amount: Number(returnedAmount),
          }),
        });
        if (!res.ok) throw new Error("confirm_failed");
        if (!cancelled) router.replace("/pricing?success=1");
      } catch {
        if (!cancelled) setError(isKo ? "결제 확인 실패" : "Payment confirmation failed");
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router, isKo]);

  if (!configured) {
    return (
      <p className="text-sm dark:text-white text-gray-600">
        {isKo
          ? "결제 설정이 준비 중입니다. 문의해 주세요."
          : "Payments are being configured. Contact us."}
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm dark:text-white">
        <Loader2 className="h-5 w-5 animate-spin" />
        {isKo ? "결제 확인 중…" : "Confirming payment…"}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/30 p-5">
      <div id="pro-payment-method" />
      <div id="pro-agreement" className="mt-4" />
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={!ready || paying || !orderId}
        onClick={async () => {
          if (!widgetRef.current || !orderId) return;
          setPaying(true);
          setError(null);
          try {
            await widgetRef.current.requestPayment({
              orderId,
              orderName: isKo ? "THINKAD PRO 월 구독" : "THINKAD PRO monthly",
              customerName,
              customerEmail,
              successUrl: `${window.location.origin}${window.location.pathname}?success=1`,
              failUrl: `${window.location.origin}${window.location.pathname}?fail=1`,
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "payment_failed");
          } finally {
            setPaying(false);
          }
        }}
        className="tkad-neon-cta-clean mt-6 flex h-12 w-full items-center justify-center rounded-xl text-sm font-black dark:text-white text-gray-900 disabled:opacity-50"
      >
        {paying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          isKo ? "PRO 구독 결제하기" : "Subscribe to PRO"
        )}
      </button>
    </div>
  );
}
