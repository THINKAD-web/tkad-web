"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Download, Loader2 } from "lucide-react";
import { captureElementAsPng } from "@/lib/html-to-pdf";

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
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function fmtAmount(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

export default function CampaignReportPreview({ data }: { data: CampaignReportData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const stats = (() => {
    if (!data.mediaBookings?.length) return null;
    let totalExposure = 0, totalDays = 0;
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
      await captureElementAsPng(ref.current, `싱커드_게재보고서_${d}.png`);
    } finally { setBusy(false); }
  };

  const handlePdf = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const html2canvas = (await import("html2canvas")).default;
      const { default: JsPDF } = await import("jspdf");
      const canvas = await html2canvas(ref.current, {
        scale: 2, useCORS: true, allowTaint: false,
        backgroundColor: "#ffffff", scrollX: 0, scrollY: -window.scrollY, imageTimeout: 20000,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 0;
      while (y < pdfH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, pdfW, pdfH);
        y += pageH;
      }
      pdf.save(`싱커드_게재보고서_${d}.pdf`);
    } finally { setBusy(false); }
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

      {/* ───── 보고서 본문 ───── */}
      <div ref={ref} className="bg-white font-sans" style={{ fontFamily: "system-ui, sans-serif" }}>

        {/* 헤더 배너 */}
        <div style={{ background: "linear-gradient(135deg, #1a2a6c 0%, #0c1a42 100%)", padding: "32px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "#e8d5b5", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
                THINKAD · 싱커드
              </p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", margin: "2px 0 16px" }}>
                OOH 광고 게재 완료 보고서
              </p>
              <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 800, margin: "0 0 6px", lineHeight: 1.2 }}>
                {data.campaignName || "캠페인명"}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: 0 }}>
                {[data.clientCompany, data.clientName, data.clientEmail].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "#e8d5b5", color: "#1a2a6c", borderRadius: "20px", padding: "4px 14px", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                게재 완료
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", margin: "8px 0 0", textAlign: "right" }}>
                발행일 {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "32px 40px" }}>

          {/* 핵심 KPI */}
          {(stats || totalAmount > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
              {stats && (<>
                <div style={{ background: "#f8faff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>집행 매체</p>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: "#1a2a6c", margin: 0 }}>{stats.mediaCount}<span style={{ fontSize: "14px" }}>개</span></p>
                </div>
                <div style={{ background: "#f8faff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>집행 기간</p>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: "#1a2a6c", margin: 0 }}>{stats.totalDays}<span style={{ fontSize: "14px" }}>일</span></p>
                </div>
                <div style={{ background: "#1a2a6c", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#e8d5b5", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>누적 노출 추정</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                    {stats.totalExposure > 0 ? `${Math.round(stats.totalExposure / 10000).toLocaleString()}만` : "—"}
                  </p>
                </div>
              </>)}
              {totalAmount > 0 && (
                <div style={{ background: "#fffbeb", borderRadius: "12px", padding: "16px", border: "1px solid #fde68a", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>총 집행 금액</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "#92400e", margin: 0 }}>{fmtAmount(totalAmount)}</p>
                </div>
              )}
            </div>
          )}

          {/* 집행 매체 */}
          {data.mediaBookings && data.mediaBookings.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                📍 집행 매체 상세
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#1a2a6c", color: "#ffffff" }}>
                    {["매체명", "위치", "집행 기간", "일 유동인구", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mediaBookings.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8faff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1a2a6c" }}>{b.mediaName}</td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{b.location}</td>
                      <td style={{ padding: "10px 12px", color: "#475569", fontSize: "11px" }}>
                        {fmtDate(b.startsAt)} ~ {fmtDate(b.endsAt)}
                        <span style={{ color: "#94a3b8", marginLeft: "4px" }}>({diffDays(b.startsAt, b.endsAt)}일)</span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#1a2a6c", fontWeight: 600 }}>
                        {b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString()}명` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#ecfdf5", color: "#065f46", borderRadius: "20px", padding: "2px 10px", fontSize: "10px", fontWeight: 700 }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 게재 사진 */}
          {data.proofPhotos && data.proofPhotos.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                📸 게재 증빙 사진
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {data.proofPhotos.slice(0, 9).map((p, i) => (
                  <div key={i} style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.caption ?? ""} crossOrigin="anonymous"
                      style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
                    {p.caption && (
                      <p style={{ margin: 0, padding: "6px 10px", fontSize: "10px", color: "#64748b", background: "#f8faff" }}>{p.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 진행 일정 */}
          {data.scheduleEvents && data.scheduleEvents.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                📅 진행 일정
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {data.scheduleEvents.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e8d5b5", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#1a2a6c" }}>{e.title}</span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{fmtDate(e.startsAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 비용 내역 */}
          {data.financialDocs && data.financialDocs.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                💰 비용 내역
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["구분", "항목", "금액", "상태"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.financialDocs.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#ffffff" : "#f8faff" }}>
                      <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "11px" }}>{f.kind}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a2a6c" }}>{f.title}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1a2a6c" }}>{f.amountKrw ? fmtAmount(f.amountKrw) : "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: "11px", color: "#64748b" }}>{f.status}</td>
                    </tr>
                  ))}
                  {totalAmount > 0 && (
                    <tr style={{ background: "#1a2a6c" }}>
                      <td colSpan={2} style={{ padding: "10px 12px", color: "#e8d5b5", fontWeight: 700, fontSize: "12px" }}>합계</td>
                      <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 800, fontSize: "14px" }}>{fmtAmount(totalAmount)}</td>
                      <td style={{ padding: "10px 12px" }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 특이사항 */}
          {data.notes && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                📝 특이사항
              </h2>
              <p style={{ background: "#f8faff", borderRadius: "8px", padding: "14px 16px", fontSize: "12px", color: "#334155", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {data.notes}
              </p>
            </div>
          )}

          {/* 푸터 */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#1a2a6c", margin: "0 0 2px" }}>주식회사 싱커드 (THINKAD)</p>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>mannote@tkad.co.kr · 02-515-2772 · 서울특별시 성동구</p>
            </div>
            <p style={{ fontSize: "10px", color: "#cbd5e1", margin: 0 }}>© 2026 THINKAD. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
