"use client";

import { useEffect, useRef, useState } from "react";
import { ANONYMOUS, loadPaymentWidget } from "@tosspayments/payment-widget-sdk";
import { Loader2 } from "lucide-react";
import {
  getTossClientKey,
  isTossPaymentsConfigured,
} from "@/lib/toss-payments-client";
import {
  orderNameForCheckoutPlan,
  type CheckoutablePlan,
} from "@/lib/subscription-billing-client";

type Props = {
  isKo: boolean;
  customerName: string;
  customerEmail: string;
  plan?: CheckoutablePlan;
  /** false면 사용자가 버튼을 누를 때만 체크아웃/위젯 생성 (LITE·AGENCY) */
  autoStart?: boolean;
};

export function ProSubscriptionCheckout({
  isKo,
  customerName,
  customerEmail,
  plan = "PRO",
  autoStart = true,
}: Props) {
  const widgetRef = useRef<Awaited<ReturnType<typeof loadPaymentWidget>> | null>(null);
  const [started, setStarted] = useState(autoStart);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientKey = getTossClientKey();
  const configured = isTossPaymentsConfigured();
  const methodElId = `${plan.toLowerCase()}-payment-method`;
  const agreementElId = `${plan.toLowerCase()}-agreement`;

  useEffect(() => {
    if (!configured || !started) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = (await res.json()) as {
          data?: { orderId: string; amount: number };
          error?: { message?: string } | string;
        };
        if (!res.ok || !data.data?.orderId) {
          const errMsg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message ?? "checkout_failed";
          throw new Error(errMsg);
        }
        if (cancelled) return;
        setOrderId(data.data.orderId);
        setChargeAmount(data.data.amount);

        const widget = await loadPaymentWidget(clientKey!, ANONYMOUS);
        if (cancelled) return;
        await widget.renderPaymentMethods(`#${methodElId}`, {
          value: data.data.amount,
        });
        await widget.renderAgreement(`#${agreementElId}`);
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
  }, [clientKey, configured, plan, methodElId, agreementElId, started]);

  if (!configured) {
    return (
      <p className="text-sm dark:text-white text-gray-600">
        {isKo
          ? "결제 설정이 준비 중입니다. 문의해 주세요."
          : "Payments are being configured. Contact us."}
      </p>
    );
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="tkad-qp-cta flex h-12 w-full items-center justify-center rounded-xl text-sm font-black text-white"
      >
        {isKo ? "카드 결제 준비" : "Prepare card payment"}
      </button>
    );
  }

  const payLabel =
    plan === "LITE"
      ? isKo
        ? "LITE 구독 결제하기"
        : "Subscribe to LITE"
      : plan === "AGENCY"
        ? isKo
          ? "AGENCY 구독 결제하기"
          : "Subscribe to AGENCY"
        : isKo
          ? "PRO 구독 결제하기"
          : "Subscribe to PRO";

  return (
    <div className="rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/30 p-5">
      <div id={methodElId} />
      <div id={agreementElId} className="mt-4" />
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={!ready || paying || !orderId || chargeAmount == null}
        onClick={async () => {
          if (!widgetRef.current || !orderId) return;
          setPaying(true);
          setError(null);
          try {
            await widgetRef.current.requestPayment({
              orderId,
              orderName: orderNameForCheckoutPlan(plan, isKo),
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
        className="tkad-qp-cta mt-6 flex h-12 w-full items-center justify-center rounded-xl text-sm font-black text-white disabled:opacity-50"
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : payLabel}
      </button>
    </div>
  );
}

export const PaidSubscriptionCheckout = ProSubscriptionCheckout;
