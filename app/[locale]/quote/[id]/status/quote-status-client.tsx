"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { Loader2, Check, Circle } from "lucide-react";

type QuotePublic = {
  id: string;
  status: string;
  invoiceSentAt: string | null;
  contractDocUrl: string | null;
  invoiceDocUrl: string | null;
};

/** `lib/ooh-quote` ORDER와 동일한 인덱스 */
const STATUS_ORDER = [
  "draft",
  "sent",
  "booking_requested",
  "booking_pending",
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
] as const;

const MILESTONE_MIN_LEVEL = [1, 2, 4, 5, 7, 8] as const;

export default function QuoteStatusClient({
  quoteId,
}: {
  quoteId: string;
}) {
  const t = useTranslations("quoteCustomer");
  const [quote, setQuote] = useState<QuotePublic | null>(null);
  const [loading, setLoading] = useState(true);

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

  const level = (STATUS_ORDER as readonly string[]).indexOf(quote.status);
  const safeLevel = level >= 0 ? level : 0;

  const milestoneLabels = [
    t("milestone_quoteSent"),
    t("milestone_bookingRequest"),
    t("milestone_bookingConfirmed"),
    t("milestone_invoice"),
    t("milestone_payment"),
    t("milestone_contract"),
  ];

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
        <div className="space-y-4 p-5">
          {milestoneLabels.map((label, i) => {
            const min = MILESTONE_MIN_LEVEL[i];
            const done = safeLevel >= min;
            return (
              <div key={label} className="flex items-start gap-3">
                <div
                  className={
                    done
                      ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-accent bg-accent text-accent-foreground"
                      : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-card text-muted-foreground"
                  }
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <p
                    className={
                      "text-sm font-bold " +
                      (done ? "text-foreground" : "text-muted-foreground")
                    }
                  >
                    {label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
