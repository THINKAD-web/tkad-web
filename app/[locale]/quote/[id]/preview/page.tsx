"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { FullPageSpinner, EmptyState } from "@/components/ui/spinner";
import { QuoteStatusBadge } from "@/components/my/quote-status-badge";

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
  const styles =
    score >= 4
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : score >= 3
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[11px] font-semibold ${styles}`}
    >
      <ShieldCheck className="w-3 h-3" />
      {tier}
    </span>
  );
}

export default function QuotePreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quote/${id}/detail`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (data.ok) setQuote(data.data);
          else setErr(data?.error?.code ?? "조회 실패");
        }
      } catch {
        if (!cancelled) setErr("네트워크 오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <FullPageSpinner label="제안서 불러오는 중…" />;
  }

  if (err || !quote) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <EmptyState
          icon="⚠️"
          title="제안서를 불러올 수 없습니다"
          description={
            err === "NOT_FOUND"
              ? "요청한 제안서를 찾을 수 없습니다. 링크를 다시 확인해주세요."
              : "잠시 후 다시 시도해주세요."
          }
          action={
            <Link
              href="/media/map"
              className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              매체 탐색하러 가기
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-secondary/20 to-background min-h-[calc(100vh-72px)]">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <Link
          href="/my"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          대시보드로
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">
                제안서 #{quote.id.slice(-8)}
              </h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              생성일 {formatDate(quote.createdAt)}
            </p>
          </div>
          <a
            href={`/api/quote/${quote.id}/pdf`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            PDF 다운로드
          </a>
        </header>

        <section className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 sm:p-6 mb-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            캠페인 정보
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
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

        <section className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden mb-5">
          <header className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              선택한 매체
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {quote.medias.length}개
            </span>
          </header>
          <ul className="divide-y divide-border/60">
            {quote.medias.map((m) => (
              <li key={m.id} className="p-4 sm:p-5 flex gap-3 sm:gap-4">
                {m.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.image}
                    alt=""
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-secondary rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link
                      href={`/media/${m.id}`}
                      className="text-sm sm:text-base font-semibold text-foreground hover:text-primary truncate"
                    >
                      {m.name}
                    </Link>
                    <VerificationBadge score={m.visibilityScore} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {m.location}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[10px] uppercase font-semibold">{m.type}</span>
                    </span>
                    {m.dailyFootTraffic != null && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        일 유동 {new Intl.NumberFormat("ko-KR").format(m.dailyFootTraffic)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-primary tabular-nums">
                    {formatKRW(m.price)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl shadow-md p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-80 uppercase tracking-wider mb-1">총 견적</div>
              <div className="text-3xl sm:text-4xl font-extrabold tabular-nums">
                {formatKRW(quote.totalAmount)}
              </div>
            </div>
            <Wallet className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-xs opacity-80 mt-3">
            VAT 별도 · {quote.medias.length}개 매체 합산 · {quote.period}
          </p>
        </section>
      </div>
    </div>
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
      <span className="flex-shrink-0 mt-0.5 text-muted-foreground">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
        <dd className="text-sm font-medium text-foreground break-words">{value}</dd>
      </div>
    </div>
  );
}
