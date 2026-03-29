"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <p className="py-16 text-center text-sm text-red-600">{t("loadError")}</p>
    );
  }

  if (quote.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("milestone_cancelled")}</p>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <Link href="/quote">{t("backToQuote")}</Link>
        </Button>
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
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("statusTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("statusSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">{t("timeline")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {milestoneLabels.map((label, i) => {
            const min = MILESTONE_MIN_LEVEL[i];
            const done = safeLevel >= min;
            return (
              <div key={label} className="flex items-start gap-3">
                <div
                  className={
                    done
                      ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white"
                      : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-300"
                  }
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <p className={"font-medium " + (done ? "text-navy" : "text-muted-foreground")}>
                    {label}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {quote.invoiceSentAt || quote.invoiceDocUrl ? (
        <Card className="border-gold/30 bg-amber-50/40">
          <CardContent className="p-4 text-sm text-navy">
            <p>{t("invoiceEmailed")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("bankHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">{t("bankHint")}</p>
      )}

      <Button type="button" variant="outline" asChild>
        <Link href={`/quote/${quoteId}`}>{t("backToDetail")}</Link>
      </Button>
    </div>
  );
}
