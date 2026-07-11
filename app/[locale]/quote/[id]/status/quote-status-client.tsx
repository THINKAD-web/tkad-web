"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { QuoteContractCta } from "@/components/quote/quote-contract-cta";
import { QuoteStatusTimeline } from "@/components/quote/quote-status-timeline";
import { Loader2 } from "lucide-react";

type QuotePublic = {
  id: string;
  status: string;
  invoiceSentAt: string | null;
  contractDocUrl: string | null;
  invoiceDocUrl: string | null;
  contractSigned: boolean;
  canSignContract: boolean;
};

export default function QuoteStatusClient({
  quoteId,
}: {
  quoteId: string;
}) {
  const t = useTranslations("quoteCustomer");
  const [quote, setQuote] = useState<QuotePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}`, { cache: "no-store" });
      const raw: unknown = await res.json();
      if (!res.ok) {
        setQuote(null);
        return;
      }
      const q =
        typeof raw === "object" &&
        raw !== null &&
        "quote" in raw &&
        typeof (raw as { quote: unknown }).quote === "object"
          ? (raw as { quote: QuotePublic }).quote
          : null;
      setQuote(q);
    } catch {
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onWithdrawProceed = async () => {
    if (!quote || quote.status !== "booking_requested" || withdrawing) return;
    if (!window.confirm(t("withdrawProceedConfirmBody"))) return;

    setWithdrawing(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/withdraw-proceed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        window.alert(t("withdrawProceedFail"));
        await load();
        return;
      }
      await load();
    } catch {
      window.alert(t("withdrawProceedFail"));
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        {`// LOADING`}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="mx-auto max-w-lg border-2 border-accent bg-card py-10 text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          [ ERROR ]
        </p>
        <p className="mt-3 px-4 text-sm text-foreground">{t("loadError")}</p>
      </div>
    );
  }

  if (quote.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg border-2 border-border bg-muted px-4 py-10 text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          [ CANCELLED ]
        </p>
        <p className="mt-3 text-sm text-foreground">{t("milestone_cancelled")}</p>
        <div className="mt-6 flex justify-center">
          <BtnBlock href="/quote" variant="secondary" size="md">
            {t("backToQuote")}
          </BtnBlock>
        </div>
      </div>
    );
  }

  const showContractBlock =
    quote.contractSigned || quote.status === "booking_confirmed";
  const showWithdrawProceed = quote.status === "booking_requested";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          [ QUOTE STATUS ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("statusTitle")}
        </h1>
        <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
          {`// `}{t("statusSubtitle")}
        </p>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            [ TIMELINE ]
          </p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-foreground">
            {t("timeline")}
          </h2>
        </div>
        <div className="p-5">
          <QuoteStatusTimeline
            status={quote.status}
            contractSigned={quote.contractSigned}
          />
        </div>
      </div>

      {showWithdrawProceed ? (
        <div className="border-2 border-amber-400/40 bg-amber-50/80 p-5 dark:border-amber-400/25 dark:bg-amber-500/10">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-amber-800 dark:text-amber-200">
            [ {t("bookingRequestedBannerTitle")} ]
          </p>
          <p className="mt-2 text-sm text-foreground">{t("bookingRequestedBannerBody")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={() => void onWithdrawProceed()}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("withdrawProceedButton")
              )}
            </BtnBlock>
            <BtnBlock href={`/quote/${quoteId}`} variant="secondary" size="md">
              {t("backToDetail")}
            </BtnBlock>
          </div>
        </div>
      ) : null}

      {showContractBlock ? (
        <QuoteContractCta
          quoteId={quote.id}
          status={quote.status}
          contractSigned={quote.contractSigned}
          canSignContract={quote.canSignContract}
        />
      ) : null}

      {quote.invoiceSentAt || quote.invoiceDocUrl ? (
        <div className="border-2 border-accent bg-card p-4 text-sm text-foreground">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            [ INVOICE SENT ]
          </p>
          <p className="mt-2 font-bold">{t("invoiceEmailed")}</p>
          <p className="mt-2 text-[11px] tracking-tight text-muted-foreground">
            {`// `}{t("bankHint")}
          </p>
        </div>
      ) : (
        <p className="text-[11px] tracking-tight text-muted-foreground">
          {`// `}{t("bankHint")}
        </p>
      )}

      <BtnBlock href={`/quote/${quoteId}`} variant="secondary" size="md">
        {t("backToDetail")}
      </BtnBlock>
    </div>
  );
}
