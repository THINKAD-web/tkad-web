"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

function Badge({ score }: { score: number }) {
  const tier = score >= 4 ? "4/4" : score >= 3 ? "3/4" : score >= 2 ? "2/4" : "1/4";
  const color = score >= 4 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-600 border-gray-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-xs ${color}`}>
      <span>🛡️</span>
      <span>{tier}</span>
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
    async function load() {
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
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">불러오는 중…</div>;
  }
  if (err || !quote) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{err ?? "제안서를 찾을 수 없습니다."}</p>
        <Link href="/media/map" className="text-sm text-primary underline">
          매체 탐색하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">제안서 #{quote.id.slice(-8)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            생성일 {formatDate(quote.createdAt)} · 상태 {quote.status}
          </p>
        </div>
        <a
          href={`/api/quote/${quote.id}/pdf`}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          📄 PDF 다운로드
        </a>
      </div>

      <section className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">캠페인 정보</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">담당자</dt>
          <dd>{quote.clientName}</dd>
          <dt className="text-gray-500">회사</dt>
          <dd>{quote.clientCompany ?? "-"}</dd>
          <dt className="text-gray-500">이메일</dt>
          <dd>{quote.clientEmail}</dd>
          <dt className="text-gray-500">기간</dt>
          <dd>{quote.period}</dd>
          {quote.startDate && (
            <>
              <dt className="text-gray-500">시작 ~ 종료</dt>
              <dd>
                {formatDate(quote.startDate)} ~ {formatDate(quote.endDate)}
              </dd>
            </>
          )}
          {quote.budgetMax != null && (
            <>
              <dt className="text-gray-500">예산</dt>
              <dd>{formatKRW(quote.budgetMax)}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="bg-white border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">선택한 매체</h2>
          <span className="text-xs text-gray-400">{quote.medias.length}개</span>
        </div>
        <ul className="divide-y">
          {quote.medias.map((m) => (
            <li key={m.id} className="py-3 flex gap-3">
              {m.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.image}
                  alt={m.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-gray-500 truncate">{m.location}</div>
                  </div>
                  <Badge score={m.visibilityScore} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{m.type}</span>
                  {m.dailyFootTraffic != null && (
                    <span>일 유동 {new Intl.NumberFormat("ko-KR").format(m.dailyFootTraffic)}</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-primary mt-1">
                  {formatKRW(m.price)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-primary text-white rounded-xl p-5 flex items-center justify-between">
        <span className="text-sm opacity-80">총 견적</span>
        <span className="text-2xl font-bold">{formatKRW(quote.totalAmount)}</span>
      </section>
    </div>
  );
}
