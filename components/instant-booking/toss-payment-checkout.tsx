"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ANONYMOUS, loadPaymentWidget } from "@tosspayments/payment-widget-sdk";
import { Loader2 } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { getTossClientKey, isTossPaymentsConfigured } from "@/lib/toss-payments";

type PaymentWidgetInstance = Awaited<ReturnType<typeof loadPaymentWidget>>;

type Props = {
  bookingId: string;
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail: string;
  locale: string;
};

export function TossPaymentCheckout({
  bookingId,
  orderId,
  amount,
  orderName,
  customerName,
  customerEmail,
  locale,
}: Props) {
  const t = useTranslations("instantBooking.pay");
  const router = useRouter();
  const searchParams = useSearchParams();
  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientKey = getTossClientKey();
  const configured = isTossPaymentsConfigured();

  useEffect(() => {
    if (!configured || !clientKey) return;
    let cancelled = false;
    (async () => {
      try {
        const widget = await loadPaymentWidget(clientKey, ANONYMOUS);
        if (cancelled) return;
        await widget.renderPaymentMethods("#toss-payment-method", {
          value: amount,
        });
        await widget.renderAgreement("#toss-agreement");
        widgetRef.current = widget;
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("widgetError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, clientKey, configured, t]);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const returnedOrderId = searchParams.get("orderId");
    const returnedAmount = searchParams.get("amount");
    if (!paymentKey || !returnedOrderId || !returnedAmount) return;

    let cancelled = false;
    (async () => {
      setConfirming(true);
      try {
        const res = await fetch(
          `/api/instant-bookings/${encodeURIComponent(bookingId)}/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentKey,
              orderId: returnedOrderId,
              amount: Number(returnedAmount),
            }),
          },
        );
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? t("confirmFailed"));
        }
        if (!cancelled) router.replace(`/bookings/${bookingId}`);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("confirmFailed"));
        }
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, router, searchParams, t]);

  const handlePay = async () => {
    if (!widgetRef.current) return;
    setPaying(true);
    setError(null);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await widgetRef.current.requestPayment({
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl: `${origin}/${locale}/bookings/${bookingId}/pay`,
        failUrl: `${origin}/${locale}/bookings/${bookingId}/pay?fail=1`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payFailed"));
      setPaying(false);
    }
  };

  if (!configured) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        {t("notConfigured")}
      </p>
    );
  }

  if (confirming) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("confirming")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div id="toss-payment-method" />
      <div id="toss-agreement" />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <BtnBlock
        variant="accent"
        size="lg"
        className="w-full"
        disabled={!ready || paying}
        onClick={() => void handlePay()}
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("payButton", {
          amount: amount.toLocaleString(locale === "ko" ? "ko-KR" : "en-US"),
        })}
      </BtnBlock>
    </div>
  );
}
