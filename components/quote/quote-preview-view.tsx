"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  Mail,
  Building2,
  User as UserIcon,
  Wallet,
  Download,
  ChevronLeft,
  ShieldCheck,
  Eye,
  Loader2,
  ArrowRight,
  Lock,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { QuoteStatusBadge } from "@/components/my/quote-status-badge";
import { QuoteContractCta } from "@/components/quote/quote-contract-cta";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { formatOohQuoteTotalKrw, coerceOohQuoteTotalAmountManwon, coerceOohQuoteBudgetManwonForDisplay, formatOohQuoteBudgetKrw } from "@/lib/ooh-quote-amount";

type Media = {
  id: string;
  name: string;
  location: string;
  region: string;
  type: string;
  price: number;
  pricePeriod: string;
  image: string | null;
  visibilityScore: number;
  dailyFootTraffic: number | null;
  impressions: number | null;
};

type Quote = {
  id: string;
  status: string;
  contractSigned?: boolean;
  canSignContract?: boolean;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  period: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string;
  medias: Media[];
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
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

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

function VerificationBadge({ score }: { score: number }) {
  const tier = score >= 4 ? "4/4" : score >= 3 ? "3/4" : score >= 2 ? "2/4" : "1/4";
  const variant =
    score >= 4
      ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
      : score >= 3
        ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
        : "border-gray-200/80 bg-gray-100 text-gray-600 dark:border-white/12 dark:bg-white/5 dark:text-white/70";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        variant,
      )}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      {tier}
    </span>
  );
}

function InfoRow({
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className={cn(plannerNeon.label, "!text-[10px]")}>{label}</dt>
        <dd className="mt-1 break-words text-sm font-bold text-gray-900 dark:text-white">
          {value}
        </dd>
      </div>
    </div>
  );
}

export type QuotePreviewViewProps = {
  quoteId: string;
  /** Show the "진행 요청" (proceed) CTA when status === "sent". */
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
          /* non-JSON response */
        }
        if (cancelled) return;
        const d = data as
          | { ok?: boolean; data?: Quote; error?: { code?: string; message?: string } }
          | null;
        if (res.ok && d?.ok) {
          setQuote(d.data ?? null);
        } else {
          const code = d?.error?.code ?? `HTTP_${res.status}`;
          const message = d?.error?.message ?? res.statusText ?? "조회 실패";
          console.error("[quote preview] detail API failed", {
            quoteId,
            status: res.status,
            code,
            message,
          });
          setErr(`${code}: ${message}`);
        }
      } catch (e) {
        console.error("[quote preview] detail fetch threw", e);
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

  if (loading) {
    return <NeonFullPageSpinner label="견적서 불러오는 중…" />;
  }

  if (err || !quote) {
    const isNotFound = err?.startsWith("NOT_FOUND");
    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
          <div className="tkad-glass-surface tkad-neon-border w-full max-w-lg rounded-[28px] border p-8 text-center backdrop-blur-md">
            <p className="text-3xl" aria-hidden>
              ⚠️
            </p>
            <h1 className="mt-4 text-lg font-black text-gray-900 dark:text-white">
              견적서를 불러올 수 없습니다
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
              {isNotFound
                ? "요청한 견적서를 찾을 수 없습니다. 링크를 다시 확인해주세요."
                : err
                  ? `오류: ${err}`
                  : "잠시 후 다시 시도해주세요."}
            </p>
            <Link href="/media" className={cn(plannerNeon.cta, "mt-6 inline-flex")}>
              매체 탐색하러 가기
            </Link>
          </div>
        </div>
      </HomeLandingDayNight>
    );
  }

  const canProceed = showProceedCta && quote.status === "sent";
  const showContractCta =
    quote.contractSigned === true || quote.status === "booking_confirmed";

  const referenceMediaTotalWon = quote.medias.reduce((sum, m) => sum + (m.price ?? 0), 0);
  const { manwon: displayTotalManwon, corrected: totalAmountCorrected } =
    coerceOohQuoteTotalAmountManwon(quote.totalAmount, referenceMediaTotalWon);

  if (totalAmountCorrected) {
    console.warn("[quote-preview] OoHQuote.totalAmount unit mismatch — displaying corrected value", {
      quoteId: quote.id,
      storedTotalAmount: quote.totalAmount,
      referenceMediaTotalWon,
      displayTotalManwon,
    });
  }

  const totalDisplayKrw = formatOohQuoteTotalKrw(
    displayTotalManwon,
    isKo ? "ko-KR" : "en-US",
  );
  const budgetDisplayKrw = formatBudgetDisplay(
    quote.budgetMax,
    referenceMediaTotalWon,
    isKo ? "ko-KR" : "en-US",
  );

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/my"
            className="group mb-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 transition-colors hover:text-violet-600 dark:text-white/55 dark:hover:text-violet-300"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            대시보드로
          </Link>

          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <PlannerNeonLabel>Quote / #{quote.id.slice(-8).toUpperCase()}</PlannerNeonLabel>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                  견적서 #{quote.id.slice(-8)}
                </h1>
                <QuoteStatusBadge status={quote.status} />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
                생성일 {formatDate(quote.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              {/* 템플릿 선택 */}
              <div
                className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/12"
                role="group"
                aria-label="견적서 템플릿"
              >
                {([
                  ["basic", "기본 견적서"],
                  ["premium", "프리미엄"],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTemplate(val)}
                    aria-pressed={template === val}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      template === val
                        ? "bg-violet-600 text-white"
                        : "text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* 다운로드 형식 */}
              <div className="flex flex-wrap gap-2">
                <PlannerPdfDownloadGate
                  isKo
                  onAllowedDownload={() => void onDownload("pdf")}
                >
                  {({ onDownloadClick, pdfAllowed, checking }) => (
                    <button
                      type="button"
                      onClick={onDownloadClick}
                      disabled={downloading !== null || checking}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/12 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                    >
                      {downloading === "pdf" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : !pdfAllowed ? (
                        <Lock className="h-4 w-4" aria-hidden />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden />
                      )}
                      {downloading === "pdf"
                        ? "생성 중…"
                        : !pdfAllowed
                          ? "🔒 견적서 PDF (PRO)"
                          : "견적서 PDF 다운로드"}
                    </button>
                  )}
                </PlannerPdfDownloadGate>
                <PlannerPdfDownloadGate
                  isKo
                  onAllowedDownload={() => void onDownload("pptx")}
                >
                  {({ onDownloadClick, pdfAllowed, checking }) => (
                    <button
                      type="button"
                      onClick={onDownloadClick}
                      disabled={downloading !== null || checking}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/12 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                    >
                      {downloading === "pptx" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : !pdfAllowed ? (
                        <Lock className="h-4 w-4" aria-hidden />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden />
                      )}
                      {downloading === "pptx"
                        ? "생성 중…"
                        : !pdfAllowed
                          ? "🔒 견적서 PPT (PRO)"
                          : "견적서 PPT 다운로드"}
                    </button>
                  )}
                </PlannerPdfDownloadGate>
              {canProceed ? (
                <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                  <button
                    type="button"
                    onClick={() => setProceedConfirmOpen(true)}
                    disabled={proceeding}
                    className={cn(plannerNeon.cta, "h-11 disabled:opacity-60")}
                  >
                    {proceeding ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        {t("proceed")}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                  <p className="max-w-xs text-right text-[11px] leading-snug text-gray-500 dark:text-white/55">
                    {t("proceedNote")}
                    <span className="mt-0.5 block text-violet-700 dark:text-violet-300">
                      {t("proceedContractHint")}
                    </span>
                  </p>
                </div>
              ) : null}
              </div>
            </div>
          </header>

          {showContractCta ? (
            <QuoteContractCta
              quoteId={quote.id}
              status={quote.status}
              contractSigned={quote.contractSigned === true}
              canSignContract={quote.canSignContract !== false}
            />
          ) : null}

          <div ref={captureRef} className="space-y-4 print:bg-white">
            <PlannerNeonCard className="overflow-hidden">
              <div className={plannerNeon.cardHeader}>
                <PlannerNeonLabel>캠페인 정보</PlannerNeonLabel>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 text-sm sm:grid-cols-2 sm:p-6">
                <InfoRow icon={UserIcon} label="담당자" value={quote.clientName} />
                <InfoRow icon={Building2} label="회사" value={quote.clientCompany ?? "-"} />
                <InfoRow icon={Mail} label="이메일" value={quote.clientEmail} />
                <InfoRow icon={Calendar} label="기간" value={quote.period} />
                {quote.startDate ? (
                  <InfoRow
                    icon={Calendar}
                    label="집행 일정"
                    value={`${formatDate(quote.startDate)} ~ ${formatDate(quote.endDate)}`}
                  />
                ) : null}
                {budgetDisplayKrw != null ? (
                  <InfoRow icon={Wallet} label="예산" value={budgetDisplayKrw} />
                ) : null}
              </dl>
            </PlannerNeonCard>

            <PlannerNeonCard className="overflow-hidden">
              <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10 sm:px-6">
                <PlannerNeonLabel>선택한 매체</PlannerNeonLabel>
                <span className="text-xs font-bold tabular-nums text-gray-700 dark:text-white/80">
                  {quote.medias.length}개
                </span>
              </header>
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {quote.medias.map((m) => (
                  <li
                    key={m.id}
                    className="group flex gap-3 p-4 transition-colors hover:bg-violet-50/50 dark:hover:bg-white/[0.03] sm:gap-4 sm:p-5"
                  >
                    {m.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.image}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl border border-gray-200 object-cover dark:border-white/10 sm:h-24 sm:w-24"
                      />
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5 sm:h-24 sm:w-24" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <Link
                          href={`/media/${m.id}`}
                          className="truncate text-sm font-bold tracking-tight text-gray-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-300 sm:text-base"
                        >
                          {m.name}
                        </Link>
                        <VerificationBadge score={m.visibilityScore} />
                      </div>
                      <p className="mb-2 truncate text-xs text-gray-500 dark:text-white/50">
                        {m.location}
                      </p>
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/45">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 dark:border-white/10 dark:bg-white/5">
                          {m.type}
                        </span>
                        {m.dailyFootTraffic != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" aria-hidden />
                            일 유동 {new Intl.NumberFormat("ko-KR").format(m.dailyFootTraffic)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-300">
                        {formatKRW(m.price)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </PlannerNeonCard>

            <div className="tkad-planner-dark-surface overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-950/90 via-[#0a0a12] to-cyan-950/80 p-5 text-white sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                    총 견적
                  </p>
                  <div className="mt-2 font-display text-3xl font-black tabular-nums sm:text-4xl">
                    {totalDisplayKrw}
                  </div>
                </div>
                <Wallet className="h-10 w-10 shrink-0 text-cyan-300/50" aria-hidden />
              </div>
              <p className="mt-4 text-xs text-white/60">
                VAT 별도 · {quote.medias.length}개 매체 합산 · {quote.period}
              </p>
            </div>
          </div>
        </div>
      </div>

      {proceedConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proceed-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/12 dark:bg-[#0a0a12]">
            <h2
              id="proceed-confirm-title"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {t("proceedConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
              {t("proceedConfirmBody")}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={proceeding}
                onClick={() => setProceedConfirmOpen(false)}
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/12 dark:text-white/80 dark:hover:bg-white/5"
              >
                {t("proceedConfirmCancel")}
              </button>
              <button
                type="button"
                disabled={proceeding}
                onClick={() => void onProceed()}
                className={cn(plannerNeon.cta, "h-10 disabled:opacity-60")}
              >
                {proceeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  t("proceedConfirmOk")
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </HomeLandingDayNight>
  );
}
