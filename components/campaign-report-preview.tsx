"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Download } from "lucide-react";
import { captureElementAsPng } from "@/lib/html-to-pdf";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";

export type CampaignReportData = {
  campaignName: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes?: string | null;
  scheduleEvents?: { title: string; startsAt: string; endsAt: string; kind: string }[];
  proofPhotos?: { imageUrl: string; caption?: string | null }[];
  mediaBookings?: { title: string; mediaName: string; location: string; startsAt: string; endsAt: string; status: string; dailyFootTraffic?: number | null }[];
  financialDocs?: { kind: string; title: string; amountKrw?: number | null; status: string }[];
};

function diffDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

export default function CampaignReportPreview({ data }: { data: CampaignReportData }) {
  const ref = useRef<HTMLDivElement>(null);

  // 통계 계산
  const stats = (() => {
    if (!data.mediaBookings || data.mediaBookings.length === 0) return null;
    let totalExposure = 0;
    let totalDays = 0;
    let mediaCount = 0;
    for (const b of data.mediaBookings) {
      const days = diffDays(b.startsAt, b.endsAt);
      const foot = b.dailyFootTraffic ?? 0;
      totalExposure += foot * days;
      totalDays += days;
      mediaCount++;
    }
    return { totalExposure, totalDays, mediaCount };
  })();

  const handleCapture = async () => {
    if (!ref.current) return;
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    await captureElementAsPng(ref.current, `싱커드_게재보고서_${d}.png`);
  };

  const handlePdf = async () => {
    if (!ref.current) return;
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // html2canvas → 이미지 → PDF
    const html2canvas = (await import("html2canvas")).default;
    const { default: JsPDF } = await import("jspdf");
    const canvas = await html2canvas(ref.current, {
      scale: 2, useCORS: true, allowTaint: false,
      backgroundColor: "#ffffff", scrollX: 0, scrollY: -window.scrollY,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    let y = 0;
    const pageH = pdf.internal.pageSize.getHeight();
    while (y < pdfH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -y, pdfW, pdfH);
      y += pageH;
    }
    pdf.save(`싱커드_게재보고서_${d}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* 버튼 */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCapture} className="gap-2">
          <Camera className="h-4 w-4" />
          이미지 저장
        </Button>
        <Button variant="outline" onClick={handlePdf} className="gap-2">
          <Download className="h-4 w-4" />
          PDF 다운로드
        </Button>
      </div>

      {/* 보고서 미리보기 */}
      <div ref={ref} className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        {/* 헤더 */}
        <div className="mb-8 border-b border-navy/10 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-navy/40">게재 완료 보고서</p>
              <h1 className="mt-1 text-2xl font-bold text-navy">{data.campaignName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.clientCompany && `${data.clientCompany} · `}{data.clientName} · {data.clientEmail}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {data.status}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            발행일: {new Date().toLocaleDateString("ko-KR")}
          </p>
        </div>

        {/* 핵심 통계 */}
        {stats && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-navy px-4 py-4 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">집행 매체 수</p>
              <p className="mt-1 text-2xl font-bold">{stats.mediaCount}개</p>
            </div>
            <div className="rounded-xl bg-navy px-4 py-4 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">총 집행 일수</p>
              <p className="mt-1 text-2xl font-bold">{stats.totalDays}일</p>
            </div>
            <div className="rounded-xl bg-gold px-4 py-4 text-center text-navy">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/60">누적 노출 추정</p>
              <p className="mt-1 text-2xl font-bold">
                {stats.totalExposure > 0
                  ? `${Math.round(stats.totalExposure / 10000).toLocaleString()}만`
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* 매체 정보 */}
        {data.mediaBookings && data.mediaBookings.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">집행 매체</h2>
            <div className="overflow-hidden rounded-xl border border-navy/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">매체명</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">위치</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">기간</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mediaBookings.map((b, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2.5 font-semibold text-navy">{b.mediaName}</td>
                      <td className="px-4 py-2.5 text-navy/70">{b.location}</td>
                      <td className="px-4 py-2.5 text-navy/70 text-xs">
                        {new Date(b.startsAt).toLocaleDateString("ko-KR")} ~ {new Date(b.endsAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 게재 사진 */}
        {data.proofPhotos && data.proofPhotos.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">게재 사진</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.proofPhotos.slice(0, 6).map((p, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-navy/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt={p.caption ?? ""} className="h-40 w-full object-cover" crossOrigin="anonymous" />
                  {p.caption && <p className="px-2 py-1.5 text-xs text-muted-foreground">{p.caption}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 일정 */}
        {data.scheduleEvents && data.scheduleEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">진행 일정</h2>
            <div className="space-y-2">
              {data.scheduleEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-navy/8 bg-slate-50/60 px-4 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-gold" />
                  <span className="flex-1 text-sm font-semibold text-navy">{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.startsAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 비용 */}
        {data.financialDocs && data.financialDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">비용 내역</h2>
            <div className="overflow-hidden rounded-xl border border-navy/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy/5">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy/60">구분</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy/60">항목</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-navy/60">금액</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy/60">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.financialDocs.map((f, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.kind}</td>
                      <td className="px-4 py-2.5 font-semibold text-navy">{f.title}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-navy">
                        {f.amountKrw
                          ? f.amountKrw >= 100000000
                            ? `₩${(f.amountKrw / 100000000).toFixed(1).replace(/\.0$/, "")}억원`
                            : `₩${Math.round(f.amountKrw / 10000).toLocaleString()}만원`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 메모 */}
        {data.notes && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">특이사항</h2>
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-navy/80 whitespace-pre-wrap">{data.notes}</p>
          </section>
        )}

        {/* 푸터 */}
        <div className="border-t border-navy/10 pt-6 text-xs text-muted-foreground">
          <p>본 보고서는 주식회사 싱커드(THINKAD)가 발행했습니다.</p>
          <p>문의: mannote@tkad.co.kr · 02-515-2772</p>
        </div>
      </div>
    </div>
  );
}
