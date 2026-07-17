"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  Mail,
  Phone,
  Building2,
  User as UserIcon,
  Wallet,
  Download,
  ChevronLeft,
  Loader2,
  ArrowRight,
  Lock,
  FileText,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import { BtnBlock } from "@/components/brutalist";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { QuotePdfPreview } from "@/components/quote/quote-preview";
import { QuoteMediaLineCard } from "@/components/document/quote-media-line-card";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { QuoteStatusBadge } from "@/components/my/quote-status-badge";
import { QuoteContractCta } from "@/components/quote/quote-contract-cta";
import { QuoteRevisionRequestPanel } from "@/components/quote/quote-revision-request-panel";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import {
  formatOohQuoteTotalKrw,
  coerceOohQuoteTotalAmountManwon,
  coerceOohQuoteBudgetManwonForDisplay,
  formatOohQuoteBudgetKrw,
} from "@/lib/ooh-quote-amount";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";
import {
  buildQuotePreviewLineDetails,
  buildQuotePreviewPdfRows,
  inferQuotePreviewPeriodMonths,
  quotePreviewAmountsWon,
  type QuoteDetailPreviewMedia,
} from "@/lib/quote-preview-from-detail";

type Quote = {
  id: string;
  status: string;
  contractSigned?: boolean;
  canSignContract?: boolean;
  clientName: string;
  clientPhone?: string | null;
  clientEmail: string;
  clientCompany: string | null;
  period: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string;
  revisionMessage?: string | null;
  revisionRequestedAt?: string | null;
  medias: QuoteDetailPreviewMedia[];
  mediaSelections?: QuoteMediaSelectionSnapshot[] | null;
};

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

function formatBudgetDisplay(
  budgetMax: number | null,
  referenceMonthlyWon: number,
  locale: string,
): string | null {
  if (budgetMax == null) return null;
  const { manwon } = coerceOohQuoteBudgetManwonForDisplay(
    budgetMax,
    referenceMonthlyWon,
  );
  if (manwon == null) return null;
  return formatOohQuoteBudgetKrw(manwon, locale);
}

export type QuotePreviewViewProps = {
  quoteId: string;
  showProceedCta?: boolean;
};

export default function QuotePreviewView({
  quoteId,
  showProceedCta = true,
}: QuotePreviewViewProps) {
  const t = useTranslations("quoteCustomer");
  const locale = useLocale();
  const isKo = locale === "ko";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [template, setTemplate] = useState<"basic" | "premium">("basic");
  const [downloading, setDownloading] = useState<"pdf" | "pptx" | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [proceedConfirmOpen, setProceedConfirmOpen] = useState(false);
  const [revisionRequestedAt, setRevisionRequestedAt] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const toast = useAppToast();

  const onDownload = async (format: "pdf" | "pptx") => {
    if (!quote || downloading) return;
    setDownloading(format);
    try {
      const res = await fetch(
        `/api/quote/${quote.id}/${format}?template=${template}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`${format.toUpperCase()} HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/i);
      const name = m
        ? decodeURIComponent(m[1]!)
        : `THINKAD_견적서_${quote.id.slice(-8)}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} 다운로드 완료 · ${name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[quote preview] export failed", e);
      toast.error(`${format.toUpperCase()} 생성에 실패했습니다. 잠시 후 다시 시도해주세요.`);
      window.alert(`생성 실패\n${msg}`);
    } finally {
      setDownloading(null);
    }
  };

  const onProceed = async () => {
    if (!quote) return;
    setProceeding(true);
    try {
      const res = await fetch(`/api/quote/${quote.id}/proceed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        toast.error(isKo ? "진행 요청에 실패했습니다." : "Could not send request.");
        return;
      }
      toast.success(t("proceedOk"));
      setProceedConfirmOpen(false);
      window.location.href = `/quote/${quote.id}/status`;
    } catch {
      toast.error(isKo ? "네트워크 오류가 발생했습니다." : "Network error.");
    } finally {
      setProceeding(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quote/${quoteId}/detail`, { cache: "no-store" });
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          /* non-JSON */
        }
        if (cancelled) return;
        const d = data as
          | { ok?: boolean; data?: Quote; error?: { code?: string; message?: string } }
          | null;
        if (res.ok && d?.ok) {
          const data = d.data ?? null;
          setQuote(data);
          setRevisionMessage(data?.revisionMessage ?? null);
          setRevisionRequestedAt(data?.revisionRequestedAt ?? null);
        } else {
          const code = d?.error?.code ?? `HTTP_${res.status}`;
          const message = d?.error?.message ?? res.statusText ?? "조회 실패";
          setErr(`${code}: ${message}`);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(`NETWORK: ${e instanceof Error ? e.message : String(e)}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  const referenceMediaTotalWon = useMemo(
    () => (quote?.medias ?? []).reduce((sum, m) => sum + (m.price ?? 0), 0),
    [quote?.medias],
  );

  const displayTotalManwon = useMemo(() => {
    if (!quote) return 0;
    const { manwon } = coerceOohQuoteTotalAmountManwon(
      quote.totalAmount,
      referenceMediaTotalWon,
    );
    return manwon;
  }, [quote, referenceMediaTotalWon]);

  const totalDisplayKrw = useMemo(
    () =>
      formatOohQuoteTotalKrw(displayTotalManwon, isKo ? "ko-KR" : "en-US"),
    [displayTotalManwon, isKo],
  );

  const budgetDisplayKrw = useMemo(
    () =>
      quote
        ? formatBudgetDisplay(
            quote.budgetMax,
            referenceMediaTotalWon,
            isKo ? "ko-KR" : "en-US",
          )
        : null,
    [quote, referenceMediaTotalWon, isKo],
  );

  const periodMonths = useMemo(
    () => (quote ? inferQuotePreviewPeriodMonths(quote.period) : 1),
    [quote],
  );

  const pdfPreviewRows = useMemo(
    () =>
      quote
        ? buildQuotePreviewPdfRows(
            quote.medias,
            quote.mediaSelections,
            isKo,
            quote.period,
          )
        : [],
    [quote, isKo],
  );

  const lineDetails = useMemo(
    () =>
      quote
        ? buildQuotePreviewLineDetails(
            quote.medias,
            quote.mediaSelections,
            isKo,
            quote.period,
          )
        : [],
    [quote, isKo],
  );

  const { subtotalWon, vatWon, grandTotalWon } = useMemo(
    () => quotePreviewAmountsWon(displayTotalManwon),
    [displayTotalManwon],
  );

  const issuedAt = useMemo(
    () => (quote ? new Date(quote.createdAt) : new Date()),
    [quote],
  );

  if (loading) {
    return <NeonFullPageSpinner label="견적서 불러오는 중…" />;
  }

  if (err || !quote) {
    const isNotFound = err?.startsWith("NOT_FOUND");
    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
          <div className="tkad-glass-surface border-gray-200 dark:border-white/12 w-full max-w-lg rounded-[32px] border p-8 text-center backdrop-blur-md">
            <p className="text-3xl" aria-hidden>
              ⚠️
            </p>
            <h1 className="mt-4 text-lg font-black text-foreground">
              견적서를 불러올 수 없습니다
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isNotFound
                ? "요청한 견적서를 찾을 수 없습니다. 링크를 다시 확인해주세요."
                : err ?? "잠시 후 다시 시도해주세요."}
            </p>
            <Link href="/media" className="mt-6 inline-block">
              <BtnBlock variant="accent" size="md">
                {isKo ? "매체 탐색하러 가기" : "Browse media"}
              </BtnBlock>
            </Link>
          </div>
        </div>
      </HomeLandingDayNight>
    );
  }

  const canProceed = showProceedCta && quote.status === "sent";
  const isDraft = quote.status === "draft";
  const showSentBanner = quote.status === "sent";
  const showContractCta =
    quote.contractSigned === true || quote.status === "booking_confirmed";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
        <CategoryExploreHero
          code="// 07 / Quote"
          headlineBefore={isKo ? "" : "Your "}
          headlineGradient={isKo ? "견적서" : "Quote"}
          subtitle={t("detailSubtitle")}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <QuoteStatusBadge status={quote.status} />
            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              #{quote.id.slice(-8).toUpperCase()}
            </span>
          </div>
        </CategoryExploreHero>

        <section className="border-t border-white/8 bg-transparent py-10 sm:py-14">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
            <Link
              href="/my"
              className="group mb-6 inline-flex items-center gap-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {isKo ? "대시보드로" : "Dashboard"}
            </Link>

            {isDraft ? (
              <div className="mb-6 rounded-[22px] border-2 border-amber-400/40 bg-amber-50/90 px-5 py-4 dark:border-amber-400/30 dark:bg-amber-500/10">
                <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-amber-800 dark:text-amber-200">
                  [ {t("draftBannerTitle")} ]
                </p>
                <p className="mt-1 text-sm font-medium text-amber-950 dark:text-amber-50/90">
                  {t("draftBannerBody")}
                </p>
              </div>
            ) : null}

            {showSentBanner ? (
              <div className="mb-6 rounded-[22px] border-2 border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-5 py-4">
                <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--qp-accent)]">
                  [ {t("sentBannerTitle")} ]
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
                  {t("sentBannerBody")}
                </p>
              </div>
            ) : null}

            {showSentBanner ? (
              <div className="mb-6">
                <QuoteRevisionRequestPanel
                  embedded
                  quoteId={quote.id}
                  status={quote.status}
                  revisionMessage={revisionMessage}
                  revisionRequestedAt={revisionRequestedAt}
                  onSubmitted={async () => {
                    try {
                      const res = await fetch(`/api/quote/${quoteId}/detail`, {
                        cache: "no-store",
                      });
                      const d = (await res.json()) as {
                        ok?: boolean;
                        data?: {
                          revisionMessage?: string | null;
                          revisionRequestedAt?: string | null;
                        };
                      };
                      if (res.ok && d.ok && d.data) {
                        setRevisionMessage(d.data.revisionMessage ?? null);
                        setRevisionRequestedAt(d.data.revisionRequestedAt ?? null);
                      }
                    } catch {
                      setRevisionRequestedAt(new Date().toISOString());
                    }
                  }}
                />
              </div>
            ) : null}

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <div
                  className="inline-flex rounded-2xl border-2 border-border p-0.5"
                  role="group"
                  aria-label={isKo ? "견적서 템플릿" : "Quote template"}
                >
                  {([
                    ["basic", isKo ? "기본" : "Basic"],
                    ["premium", isKo ? "프리미엄" : "Premium"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTemplate(val)}
                      aria-pressed={template === val}
                      className={cn(
                        "rounded-xl px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                        template === val
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PlannerPdfDownloadGate
                  isKo={isKo}
                  onAllowedDownload={() => void onDownload("pdf")}
                >
                  {({ onDownloadClick, pdfAllowed, checking }) => (
                    <BtnBlock
                      variant="secondary"
                      size="sm"
                      onClick={onDownloadClick}
                      disabled={downloading !== null || checking}
                    >
                      {downloading === "pdf" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !pdfAllowed ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloading === "pdf"
                        ? isKo
                          ? "생성 중…"
                          : "Generating…"
                        : !pdfAllowed
                          ? isKo
                            ? "PDF (PRO)"
                            : "PDF (PRO)"
                          : isKo
                            ? "PDF"
                            : "PDF"}
                    </BtnBlock>
                  )}
                </PlannerPdfDownloadGate>
                <PlannerPdfDownloadGate
                  isKo={isKo}
                  onAllowedDownload={() => void onDownload("pptx")}
                >
                  {({ onDownloadClick, pdfAllowed, checking }) => (
                    <BtnBlock
                      variant="secondary"
                      size="sm"
                      onClick={onDownloadClick}
                      disabled={downloading !== null || checking}
                    >
                      {downloading === "pptx" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !pdfAllowed ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloading === "pptx"
                        ? isKo
                          ? "생성 중…"
                          : "Generating…"
                        : !pdfAllowed
                          ? isKo
                            ? "PPT (PRO)"
                            : "PPT (PRO)"
                          : isKo
                            ? "PPT"
                            : "PPT"}
                    </BtnBlock>
                  )}
                </PlannerPdfDownloadGate>
                {canProceed ? (
                  <BtnBlock
                    variant="accent"
                    size="sm"
                    onClick={() => setProceedConfirmOpen(true)}
                    disabled={proceeding}
                  >
                    {proceeding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {t("proceed")}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </BtnBlock>
                ) : null}
              </div>
            </div>

            {canProceed ? (
              <p className="mb-6 text-right text-[11px] leading-snug text-muted-foreground">
                {t("proceedNote")}
                <span className="mt-0.5 block text-primary">{t("proceedContractHint")}</span>
              </p>
            ) : null}

            {showContractCta ? (
              <div className="mb-6">
                <QuoteContractCta
                  quoteId={quote.id}
                  status={quote.status}
                  contractSigned={quote.contractSigned === true}
                  canSignContract={quote.canSignContract !== false}
                />
              </div>
            ) : null}

            <div ref={captureRef} className="space-y-8">
              <section className="space-y-4">
                <div className="space-y-2">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    {isKo ? "[ PDF 미리보기 ]" : "[ PDF PREVIEW ]"}
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {isKo ? "공식 견적서 미리보기" : "Official quote preview"}
                  </h2>
                </div>
                <div className="min-w-0 overflow-x-auto">
                  <DocumentPreviewFrame>
                    <QuotePdfPreview
                      template={template}
                      company={quote.clientCompany ?? ""}
                      contactName={quote.clientName}
                      contactPhone={quote.clientPhone ?? ""}
                      contactEmail={quote.clientEmail}
                      periodLabel={quote.period}
                      periodMonths={periodMonths}
                      rows={pdfPreviewRows}
                      subtotalWon={subtotalWon}
                      vatWon={vatWon}
                      grandTotalWon={grandTotalWon}
                      issuedAt={issuedAt}
                      customerLogoSrc={null}
                    />
                  </DocumentPreviewFrame>
                </div>
              </section>

              <div className="tkad-glass-surface border-gray-200 dark:border-white/12 relative overflow-hidden rounded-[32px] border backdrop-blur-md">
                <div className="border-b border-border px-6 py-5 sm:px-8">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    [ {isKo ? "캠페인 정보" : "Campaign info"} ]
                  </p>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-2 sm:px-8 sm:py-6">
                  <InfoField icon={UserIcon} label={isKo ? "담당자" : "Contact"} value={quote.clientName} />
                  <InfoField icon={Building2} label={isKo ? "회사" : "Company"} value={quote.clientCompany ?? "-"} />
                  <InfoField icon={Phone} label={isKo ? "연락처" : "Phone"} value={quote.clientPhone?.trim() || "—"} />
                  <InfoField icon={Mail} label={isKo ? "이메일" : "Email"} value={quote.clientEmail || "—"} />
                  <InfoField icon={Calendar} label={isKo ? "기간" : "Period"} value={quote.period} />
                  {quote.startDate ? (
                    <InfoField
                      icon={Calendar}
                      label={isKo ? "집행 일정" : "Schedule"}
                      value={`${formatDate(quote.startDate)} ~ ${formatDate(quote.endDate)}`}
                    />
                  ) : null}
                  {budgetDisplayKrw != null ? (
                    <InfoField icon={Wallet} label={isKo ? "예산" : "Budget"} value={budgetDisplayKrw} />
                  ) : null}
                </dl>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    [ {isKo ? "선택 매체" : "Selected media"} ]
                  </p>
                  <span className="font-display text-sm font-bold tabular-nums text-foreground">
                    {quote.medias.length}
                    {isKo ? "건" : ""}
                  </span>
                </div>
                <ul className="space-y-3">
                  {lineDetails.map((detail) => (
                    <li key={detail.id}>
                      <QuoteMediaLineCard detail={detail} isKo={isKo} />
                    </li>
                  ))}
                </ul>
              </section>

              <div className="tkad-glass-surface border-gray-200 dark:border-white/12 rounded-[32px] border p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      [ {isKo ? "총 견적" : "Total"} ]
                    </p>
                    <p className="mt-2 font-display text-3xl font-black tabular-nums text-foreground sm:text-4xl">
                      {totalDisplayKrw}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isKo ? "VAT 별도" : "Excl. VAT"} · {quote.medias.length}
                      {isKo ? "개 매체" : " media"} · {quote.period}
                    </p>
                  </div>
                  <FileText className="h-10 w-10 shrink-0 text-primary/40" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {proceedConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proceed-confirm-title"
        >
          <div className="tkad-glass-surface w-full max-w-md rounded-[28px] border p-6 shadow-xl">
            <h2 id="proceed-confirm-title" className="text-lg font-bold text-foreground">
              {t("proceedConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("proceedConfirmBody")}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <BtnBlock
                variant="secondary"
                size="sm"
                disabled={proceeding}
                onClick={() => setProceedConfirmOpen(false)}
              >
                {t("proceedConfirmCancel")}
              </BtnBlock>
              <BtnBlock
                variant="accent"
                size="sm"
                disabled={proceeding}
                onClick={() => void onProceed()}
              >
                {proceeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("proceedConfirmOk")
                )}
              </BtnBlock>
            </div>
          </div>
        </div>
      ) : null}
    </HomeLandingDayNight>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-card text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 break-words text-sm font-bold text-foreground">{value}</dd>
      </div>
    </div>
  );
}
