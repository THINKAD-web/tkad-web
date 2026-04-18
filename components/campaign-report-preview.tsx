"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Download, Loader2 } from "lucide-react";
import { captureElementAsPng, downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";

export type CampaignReportData = {
  campaignName: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes?: string | null;
  scheduleEvents?: { title: string; startsAt: string; endsAt: string; kind: string }[];
  proofPhotos?: { imageUrl: string; caption?: string | null }[];
  mediaBookings?: {
    title: string;
    mediaName: string;
    location: string;
    startsAt: string;
    endsAt: string;
    status: string;
    dailyFootTraffic?: number | null;
  }[];
  financialDocs?: { kind: string; title: string; amountKrw?: number | null; status: string }[];
};

function diffDays(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function fmtAmount(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

const KIND_LABEL: Record<string, string> = {
  quote: "견적서",
  contract: "계약서",
  invoice: "세금계산서",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  sent: "발송",
  paid: "완납",
  overdue: "연체",
  cancelled: "취소",
  completed: "완료",
  hold: "보류",
};

export default function CampaignReportPreview({ data }: { data: CampaignReportData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const stats = (() => {
    if (!data.mediaBookings?.length) return null;
    let totalExposure = 0;
    let totalDays = 0;
    for (const b of data.mediaBookings) {
      const days = diffDays(b.startsAt, b.endsAt);
      totalExposure += (b.dailyFootTraffic ?? 0) * days;
      totalDays += days;
    }
    return { totalExposure, totalDays, mediaCount: data.mediaBookings.length };
  })();

  const totalAmount = data.financialDocs?.reduce((s, f) => s + (f.amountKrw ?? 0), 0) ?? 0;

  const handleCapture = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(ref.current, `THINKAD_게재보고서_${d}.png`);
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await downloadPdfFromHtmlElement(ref.current, `THINKAD_게재보고서_${d}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCapture} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          이미지 저장
        </Button>
        <Button variant="outline" size="sm" onClick={handlePdf} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          PDF 다운로드
        </Button>
      </div>

      {/* Report body */}
      <div
        ref={ref}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy/8"
        style={{ fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#060e1a] px-8 py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8913c]">
                THINKAD · OOH 광고 게재 완료 보고서
              </p>
              <h1 className="mt-2 text-[22px] font-extrabold leading-tight text-white">
                {data.campaignName || "캠페인명"}
              </h1>
              <p className="mt-1.5 text-[13px] text-white/65">
                {[data.clientCompany, data.clientName, data.clientEmail].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center rounded-full bg-[#c8913c] px-3 py-1 text-[11px] font-bold text-white">
                게재 완료
              </span>
              <p className="mt-2 text-[10px] text-white/45">
                발행일 {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-7 px-8 py-7">
          {/* KPI */}
          {(stats || totalAmount > 0) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats && (
                <>
                  <KpiCard label="집행 매체" value={`${stats.mediaCount}개`} />
                  <KpiCard label="집행 기간" value={`${stats.totalDays}일`} />
                  <KpiCard
                    label="누적 노출 추정"
                    value={stats.totalExposure > 0 ? `${Math.round(stats.totalExposure / 10_000).toLocaleString()}만` : "—"}
                    variant="accent"
                  />
                </>
              )}
              {totalAmount > 0 && (
                <KpiCard label="총 집행 금액" value={fmtAmount(totalAmount)} variant="gold" />
              )}
            </div>
          )}

          {/* Media table */}
          {!!data.mediaBookings?.length && (
            <Section title="집행 매체 상세">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-navy text-white">
                      {["매체명", "위치", "집행 기간", "일 유동인구", "상태"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.mediaBookings.map((b, i) => (
                      <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}>
                        <td className="px-3 py-2.5 font-semibold text-navy">{b.mediaName}</td>
                        <td className="px-3 py-2.5 text-slate-500">{b.location}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">
                          {fmtDate(b.startsAt)} – {fmtDate(b.endsAt)}
                          <span className="ml-1 text-slate-400">({diffDays(b.startsAt, b.endsAt)}일)</span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-navy">
                          {b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString()}명` : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Proof photos */}
          {!!data.proofPhotos?.length && (
            <Section title="게재 증빙 사진">
              <div className="grid grid-cols-3 gap-2.5">
                {data.proofPhotos.slice(0, 9).map((p, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.caption ?? ""} crossOrigin="anonymous" className="h-36 w-full object-cover" />
                    {p.caption && (
                      <p className="bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500">{p.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Schedule */}
          {!!data.scheduleEvents?.length && (
            <Section title="진행 일정">
              <div className="space-y-2">
                {data.scheduleEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#c8913c]" />
                    <span className="flex-1 text-[12px] font-semibold text-navy">{e.title}</span>
                    <span className="text-[11px] text-slate-400">{fmtDate(e.startsAt)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Financial */}
          {!!data.financialDocs?.length && (
            <Section title="비용 내역">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50">
                      {["구분", "항목", "금액", "상태"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.financialDocs.map((f, i) => (
                      <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">{KIND_LABEL[f.kind] ?? f.kind}</td>
                        <td className="px-3 py-2.5 font-semibold text-navy">{f.title}</td>
                        <td className="px-3 py-2.5 font-bold text-navy">{f.amountKrw ? fmtAmount(f.amountKrw) : "—"}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">{STATUS_LABEL[f.status] ?? f.status}</td>
                      </tr>
                    ))}
                    {totalAmount > 0 && (
                      <tr className="border-t-2 border-navy/10 bg-navy">
                        <td colSpan={2} className="px-3 py-2.5 text-[12px] font-bold text-[#c8913c]">합계</td>
                        <td className="px-3 py-2.5 text-[14px] font-extrabold text-white">{fmtAmount(totalAmount)}</td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Notes */}
          {data.notes && (
            <Section title="특이사항">
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3.5 text-[12px] leading-relaxed text-slate-700">
                {data.notes}
              </p>
            </Section>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <div>
              <p className="text-[11px] font-bold text-navy">주식회사 싱커드 (THINKAD)</p>
              <p className="mt-0.5 text-[10px] text-slate-400">mannote@tkad.co.kr · 02-515-2772 · 서울특별시 성동구</p>
            </div>
            <p className="text-[10px] text-slate-300">© 2026 THINKAD. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

const KPI_STYLES = {
  default: { bg: "border-slate-200 bg-white",    label: "text-slate-400", value: "text-navy"     },
  accent:  { bg: "border-navy/15 bg-navy",       label: "text-white/60",  value: "text-white"    },
  gold:    { bg: "border-amber-200 bg-amber-50", label: "text-amber-700", value: "text-amber-900" },
} as const;

function KpiCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: keyof typeof KPI_STYLES;
}) {
  const s = KPI_STYLES[variant];
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${s.bg}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${s.label}`}>{label}</p>
      <p className={`mt-1 text-[22px] font-extrabold tabular-nums ${s.value}`}>{value}</p>
    </div>
  );
}
