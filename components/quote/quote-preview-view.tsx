"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { FullPageSpinner, EmptyState } from "@/components/ui/spinner";
import { QuoteStatusBadge } from "@/components/my/quote-status-badge";
import { useAppToast } from "@/lib/use-toast";

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

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

function VerificationBadge({ score }: { score: number }) {
  const tier = score >= 4 ? "4/4" : score >= 3 ? "3/4" : score >= 2 ? "2/4" : "1/4";
  const variant =
    score >= 4
      ? "border-accent bg-accent text-accent-foreground"
      : score >= 3
        ? "border-border bg-hero-void text-accent"
        : "border-border bg-card text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${variant}`}
    >
      <ShieldCheck className="w-3 h-3" />
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ {label} ]
        </dt>
        <dd className="mt-1 break-words text-sm font-bold text-foreground">{value}</dd>
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
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const toast = useAppToast();

  const onDownload = async () => {
    if (!captureRef.current || !quote) return;
    setDownloading(true);
    try {
      const { downloadPdfFromHtmlElement } = await import("@/lib/html-to-pdf");
      await downloadPdfFromHtmlElement(
        captureRef.current,
        `THINKAD-견적서-${quote.id.slice(-8)}.pdf`,
      );
      toast.success("PDF를 다운로드했습니다.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[quote preview] pdf export failed", e);
      window.alert(`PDF 생성 실패\n${msg}`);
    } finally {
      setDownloading(false);
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
        toast.error("진행 요청에 실패했습니다.");
        return;
      }
      toast.success("진행 요청을 보냈습니다. 담당자가 곧 연락드립니다.");
      window.location.href = `/quote/${quote.id}/status`;
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
    return <FullPageSpinner label="견적서 불러오는 중…" />;
  }

  if (err || !quote) {
    const isNotFound = err?.startsWith("NOT_FOUND");
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <EmptyState
          icon="⚠️"
          title="견적서를 불러올 수 없습니다"
          description={
            isNotFound
              ? "요청한 견적서를 찾을 수 없습니다. 링크를 다시 확인해주세요."
              : err
                ? `오류: ${err}`
                : "잠시 후 다시 시도해주세요."
          }
          action={
            <Link
              href="/media/map"
              className="inline-flex items-center gap-2 border-2 border-border bg-card px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              매체 탐색하러 가기
            </Link>
          }
        />
      </div>
    );
  }

  const canProceed = showProceedCta && quote.status === "sent";

  return (
    <div className="min-h-[calc(100vh-72px)] bg-card">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        <Link
          href="/my"
          className="group mb-6 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-accent"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          대시보드로
        </Link>

        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ QUOTE / #{quote.id.slice(-8).toUpperCase()} ]
            </p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                견적서 #{quote.id.slice(-8)}
              </h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}생성일 {formatDate(quote.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={downloading}
              className="inline-flex h-11 items-center justify-center gap-2 border-2 border-border bg-card px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? "PDF 생성 중…" : "PDF 다운로드"}
            </button>
            {canProceed && (
              <button
                type="button"
                onClick={() => void onProceed()}
                disabled={proceeding}
                className="inline-flex h-11 items-center justify-center gap-2 border-2 border-accent bg-accent px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-foreground transition-colors hover:bg-foreground hover:border-border disabled:opacity-60"
              >
                {proceeding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    진행 요청
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        <div ref={captureRef} className="space-y-0 bg-card">
          <section className="border-2 border-border bg-card p-5 sm:p-6">
            <h2 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 캠페인 정보 ]
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
              <InfoRow icon={UserIcon} label="담당자" value={quote.clientName} />
              <InfoRow icon={Building2} label="회사" value={quote.clientCompany ?? "-"} />
              <InfoRow icon={Mail} label="이메일" value={quote.clientEmail} />
              <InfoRow icon={Calendar} label="기간" value={quote.period} />
              {quote.startDate && (
                <InfoRow
                  icon={Calendar}
                  label="집행 일정"
                  value={`${formatDate(quote.startDate)} ~ ${formatDate(quote.endDate)}`}
                />
              )}
              {quote.budgetMax != null && (
                <InfoRow icon={Wallet} label="예산" value={formatKRW(quote.budgetMax)} />
              )}
            </dl>
          </section>

          <section className="-mt-[2px] overflow-hidden border-2 border-border bg-card">
            <header className="flex items-center justify-between border-b-2 border-border px-5 py-4 sm:px-6">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ 선택한 매체 ]
              </h2>
              <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                {quote.medias.length}개
              </span>
            </header>
            <ul>
              {quote.medias.map((m, idx) => (
                <li
                  key={m.id}
                  className={`group flex gap-3 p-4 transition-colors hover:bg-muted sm:gap-4 sm:p-5 ${
                    idx > 0 ? "border-t-2 border-border" : ""
                  }`}
                >
                  {m.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.image}
                      alt=""
                      className="h-20 w-20 shrink-0 border-2 border-border object-cover sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="h-20 w-20 shrink-0 border-2 border-border bg-muted sm:h-24 sm:w-24" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <Link
                        href={`/media/${m.id}`}
                        className="truncate text-sm font-bold tracking-tight text-foreground hover:text-accent sm:text-base"
                      >
                        {m.name}
                      </Link>
                      <VerificationBadge score={m.visibilityScore} />
                    </div>
                    <p className="mb-2 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{m.location}
                    </p>
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="border-2 border-border bg-card px-1.5 py-0.5 font-bold">
                        {m.type}
                      </span>
                      {m.dailyFootTraffic != null && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          일 유동 {new Intl.NumberFormat("ko-KR").format(m.dailyFootTraffic)}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold tabular-nums text-accent">
                      {formatKRW(m.price)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="-mt-[2px] border-2 border-accent bg-hero-void p-5 text-hero-fg sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                  [ 총 견적 ]
                </p>
                <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-accent sm:text-4xl">
                  {formatKRW(quote.totalAmount)}
                </div>
              </div>
              <Wallet className="w-10 h-10 text-accent/40" />
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-hero-fg/65">
              {`// `}VAT 별도 · {quote.medias.length}개 매체 합산 · {quote.period}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
