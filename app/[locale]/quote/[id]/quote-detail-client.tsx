"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, ArrowRight, FilePenLine } from "lucide-react";
import { useToast } from "@/components/toast-provider";

type QuotePublic = {
  id: string;
  status: string;
  clientName: string;
  clientCompany: string | null;
  mediaIds: string[];
  totalAmount: number;
  period: string;
};

const CONTRACT_PAGE_STATUSES = new Set([
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
]);

export default function QuoteDetailClient({ quoteId }: { quoteId: string }) {
  const t = useTranslations("quoteCustomer");
  const { toast } = useToast();
  const [quote, setQuote] = useState<QuotePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);

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

  const downloadPdf = () => {
    window.open(`/api/quote/${quoteId}/pdf`, "_blank", "noopener,noreferrer");
  };

  const proceed = async () => {
    setProceeding(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/proceed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : "Failed";
        toast("error", msg);
        return;
      }
      toast("success", t("proceedOk"));
      void load();
    } catch {
      toast("error", t("loadError"));
    } finally {
      setProceeding(false);
    }
  };

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

  const canProceed = quote.status === "sent";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("detailTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("detailSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-navy">
            {quote.clientCompany
              ? `${quote.clientCompany} · ${quote.clientName}`
              : quote.clientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-navy">{t("fieldStatus")}</span>{" "}
            <span className="text-muted-foreground">{quote.status}</span>
          </p>
          <p>
            <span className="font-medium text-navy">{t("fieldPeriod")}</span>{" "}
            {quote.period}
          </p>
          <p>
            <span className="font-medium text-navy">{t("fieldAmount")}</span>{" "}
            ₩{quote.totalAmount.toLocaleString("ko-KR")}
          </p>
          <p className="text-muted-foreground">
            {t("fieldMediaCount")}: {quote.mediaIds.length}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {CONTRACT_PAGE_STATUSES.has(quote.status) ? (
          <Button type="button" variant="outline" asChild>
            <Link href={`/quote/${quoteId}/contract`}>
              <FilePenLine className="mr-2 h-4 w-4" />
              {t("openContract")}
            </Link>
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={downloadPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          {t("downloadPdf")}
        </Button>
        {canProceed ? (
          <Button
            type="button"
            className="bg-gold text-navy hover:bg-gold/90"
            disabled={proceeding}
            onClick={() => void proceed()}
          >
            {proceeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("proceed")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" asChild>
          <Link href={`/quote/${quoteId}/status`}>
            {t("statusLink")}
          </Link>
        </Button>
      </div>
      {canProceed ? (
        <p className="text-xs text-muted-foreground">{t("proceedNote")}</p>
      ) : null}
    </div>
  );
}
