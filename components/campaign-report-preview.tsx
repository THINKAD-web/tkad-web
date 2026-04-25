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
  startDate?: string | null;
  endDate?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
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
    type?: string | null;
    region?: string | null;
    visibilityScore?: number | null;
    operatingHours?: string | null;
    impressions?: number | null;
  }[];
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
    let totalExposure = 0, totalDays = 0, totalImpressions = 0;
    for (const b of data.mediaBookings) {
      const days = diffDays(b.startsAt, b.endsAt);
      totalExposure += (b.dailyFootTraffic ?? 0) * days;
      totalDays += days;
      totalImpressions += (b.impressions ?? 0) * days;
    }
    const avgDaily = totalDays > 0 ? Math.round(totalExposure / totalDays) : 0;
    const maxDays = Math.max(...data.mediaBookings.map((b) => diffDays(b.startsAt, b.endsAt)));
    return {
      totalExposure,
      totalDays,
      mediaCount: data.mediaBookings.length,
      avgDaily,
      maxDays,
      totalImpressions,
    };
  })();

  /** Planner 스타일 추정 KPI — 도달·빈도·CPM·ROI */
  const totalAmount2 = data.financialDocs?.reduce((s, f) => s + (f.amountKrw ?? 0), 0) ?? 0;
  const plannerKpis = (() => {
    if (!stats) return null;
    /** 노출 추정 (impressions 미설정 시 일유동 × 인지율 0.4 폴백) */
    const totalImp =
      stats.totalImpressions > 0
        ? stats.totalImpressions
        : Math.round(stats.totalExposure * 0.4);
    /** 평균 빈도 추정: 6 (월 단위 OOH 통계 평균) */
    const avgFrequency = 6;
    /** 도달인 = 총 노출 / 빈도 */
    const reach = totalImp > 0 ? Math.round(totalImp / avgFrequency) : 0;
    /** 코어 도달률 — 인구 5,000만 기준 */
    const corePopulation = 50_000_000;
    const reachCorePct = Math.min(
      100,
      Math.round((reach / corePopulation) * 100 * 10) / 10,
    );
    const reachExtendedPct = Math.min(100, Math.round(reachCorePct * 1.6 * 10) / 10);
    /** Blended CPM (원/1000노출) */
    const blendedCpm =
      totalAmount2 > 0 && totalImp > 0
        ? Math.round((totalAmount2 / totalImp) * 1000)
        : null;
    /** ROI 추정: 1억당 환산 노출가치 (단순 가이드 — 실측치 아님) */
    const roiExpected =
      totalAmount2 > 0 ? Math.round((totalImp / totalAmount2) * 100_000_000) : null;
    /** 일 평균 노출 */
    const dailyImpressionsAvg =
      stats.totalDays > 0 ? Math.round(totalImp / stats.totalDays) : 0;
    return {
      totalImp,
      avgFrequency,
      reach,
      reachCorePct,
      reachExtendedPct,
      blendedCpm,
      roiExpected,
      dailyImpressionsAvg,
    };
  })();

  /** 매체별 효율 (단가 vs 유동인구·CPM) */
  const mediaEfficiency = (() => {
    if (!data.mediaBookings?.length || !data.financialDocs?.length) return null;
    const totalDays = stats?.totalDays ?? 0;
    const total = totalAmount2;
    if (total <= 0 || totalDays <= 0) return null;
    return data.mediaBookings.slice(0, 8).map((b) => {
      const days = diffDays(b.startsAt, b.endsAt);
      const exposure = (b.dailyFootTraffic ?? 0) * days;
      const allocAmount = total * (days / totalDays / data.mediaBookings!.length);
      const cpm = exposure > 0 ? Math.round((allocAmount / exposure) * 1000) : null;
      return {
        name: b.mediaName,
        location: b.location,
        days,
        dailyFootTraffic: b.dailyFootTraffic ?? 0,
        cpm,
        type: b.type ?? null,
      };
    });
  })();

  /** 유형·지역 분포 */
  const distribution = (() => {
    if (!data.mediaBookings?.length) return null;
    const byType: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    for (const b of data.mediaBookings) {
      const t = (b.type ?? "기타").toString();
      const r = (b.region ?? b.location?.split(" ")[0] ?? "-").toString();
      byType[t] = (byType[t] ?? 0) + 1;
      byRegion[r] = (byRegion[r] ?? 0) + 1;
    }
    return {
      types: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      regions: Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  })();

  /** 평균 검증 점수 */
  const avgVisibility = (() => {
    const scores = (data.mediaBookings ?? [])
      .map((b) => b.visibilityScore)
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10; // 1 decimal
  })();

  const totalAmount = data.financialDocs?.reduce((s, f) => s + (f.amountKrw ?? 0), 0) ?? 0;
  const campaignPeriod = (() => {
    if (data.startDate && data.endDate) {
      return `${fmtDate(data.startDate)} ~ ${fmtDate(data.endDate)}`;
    }
    if (data.mediaBookings?.length) {
      const starts = data.mediaBookings.map((b) => new Date(b.startsAt).getTime());
      const ends = data.mediaBookings.map((b) => new Date(b.endsAt).getTime());
      return `${fmtDate(new Date(Math.min(...starts)).toISOString())} ~ ${fmtDate(new Date(Math.max(...ends)).toISOString())}`;
    }
    return null;
  })();

  const handleCapture = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(ref.current, `싱커드_게재보고서_${d}.png`);
    } catch (e) {
      console.error("[campaign-report] png capture failed", e);
      window.alert(
        `이미지 저장에 실패했습니다.\n${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await downloadPdfFromHtmlElement(
        ref.current,
        `싱커드_게재보고서_${d}.pdf`,
      );
    } catch (e) {
      console.error("[campaign-report] pdf export failed", e);
      window.alert(
        `PDF 생성에 실패했습니다.\n${e instanceof Error ? e.message : String(e)}`,
      );
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

      {/* ───── 보고서 본문 ───── */}
      <div ref={ref} className="bg-white font-sans" style={{ fontFamily: "system-ui, sans-serif" }}>

        {/* 헤더 배너 */}
        <div style={{ background: "linear-gradient(135deg, #0d1b2e 0%, #070e18 100%)", padding: "32px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "#c8913c", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
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
              <div style={{ background: "#c8913c", color: "#0d1b2e", borderRadius: "20px", padding: "4px 14px", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                게재 완료
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", margin: "8px 0 0", textAlign: "right" }}>
                발행일 {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "32px 40px" }}>

          {/* 캠페인 개요 */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
              📋 캠페인 개요
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", fontSize: "12px" }}>
              <div style={{ padding: "10px 14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600 }}>고객사</p>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "#0d1b2e" }}>{data.clientCompany || "—"}</p>
              </div>
              <div style={{ padding: "10px 14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600 }}>담당자</p>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "#0d1b2e" }}>{data.clientName || "—"}</p>
              </div>
              <div style={{ padding: "10px 14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600 }}>이메일</p>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: "#0d1b2e" }}>{data.clientEmail || "—"}</p>
              </div>
              <div style={{ padding: "10px 14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600 }}>캠페인 기간</p>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "#0d1b2e" }}>{campaignPeriod ?? "—"}</p>
              </div>
              {(data.budgetMin != null || data.budgetMax != null) && (
                <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", gridColumn: "span 2" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#92400e", fontWeight: 600 }}>예산 범위</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "#92400e" }}>
                    {data.budgetMin != null ? fmtAmount(data.budgetMin) : "—"}
                    {" ~ "}
                    {data.budgetMax != null ? fmtAmount(data.budgetMax) : "—"}
                  </p>
                </div>
              )}
              {data.notes && (
                <div style={{ padding: "10px 14px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #e2e8f0", gridColumn: "span 2" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600 }}>비고</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 핵심 KPI */}
          {(stats || totalAmount > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
              {stats && (<>
                <div style={{ background: "#f8faff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>집행 매체</p>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: "#0d1b2e", margin: 0 }}>{stats.mediaCount}<span style={{ fontSize: "14px" }}>개</span></p>
                </div>
                <div style={{ background: "#f8faff", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>집행 기간</p>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: "#0d1b2e", margin: 0 }}>{stats.totalDays}<span style={{ fontSize: "14px" }}>일</span></p>
                </div>
                <div style={{ background: "#0d1b2e", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", color: "#c8913c", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>누적 노출 추정</p>
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

          {/* 부가 KPI (일평균·최장 기간·평균 검증·예상 임프레션) */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: "#ffffff", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>일평균 유동</p>
                <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0d1b2e" }}>
                  {stats.avgDaily > 0 ? `${stats.avgDaily.toLocaleString()}명` : "—"}
                </p>
              </div>
              <div style={{ background: "#ffffff", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>최장 집행</p>
                <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0d1b2e" }}>
                  {stats.maxDays}일
                </p>
              </div>
              <div style={{ background: "#ffffff", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>평균 검증</p>
                <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0d1b2e" }}>
                  {avgVisibility != null ? `${avgVisibility} / 4` : "—"}
                </p>
              </div>
              <div style={{ background: "#ffffff", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>예상 임프레션</p>
                <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0d1b2e" }}>
                  {stats.totalImpressions > 0
                    ? `${Math.round(stats.totalImpressions / 10000).toLocaleString()}만`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Planner 스타일 효과 분석 (도달·빈도·CPM·ROI) */}
          {plannerKpis && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                ✨ 미디어 효과 분석 (Planner 추정)
              </h2>
              <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#64748b", lineHeight: 1.6 }}>
                실측 노출 데이터와 OOH 평균 빈도(주 6회) 가정을 결합한 추정 지표입니다. 캠페인 종료 후 실측 보정 권장.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                <div style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: "12px", padding: "14px", border: "1px solid #fcd34d" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#92400e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>코어 도달률</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#92400e" }}>
                    {plannerKpis.reachCorePct}<span style={{ fontSize: "12px", marginLeft: "1px" }}>%</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#92400e", opacity: 0.85 }}>전국 5천만 인구 기준</p>
                </div>
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>확장 도달률</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0d1b2e" }}>
                    {plannerKpis.reachExtendedPct}<span style={{ fontSize: "12px", marginLeft: "1px" }}>%</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#94a3b8" }}>SNS·온라인 부가 도달 포함</p>
                </div>
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>평균 빈도</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0d1b2e" }}>
                    {plannerKpis.avgFrequency}<span style={{ fontSize: "12px", marginLeft: "1px" }}>회/주</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#94a3b8" }}>OOH 평균 노출 빈도</p>
                </div>
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>일평균 노출</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0d1b2e" }}>
                    {plannerKpis.dailyImpressionsAvg > 0
                      ? `${(plannerKpis.dailyImpressionsAvg / 10000).toFixed(1)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#94a3b8" }}>예상 일일 노출 합산</p>
                </div>
                <div style={{ background: "#0d1b2e", borderRadius: "12px", padding: "14px", border: "1px solid #0d1b2e" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#c8913c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Blended CPM</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>
                    {plannerKpis.blendedCpm != null
                      ? `₩${plannerKpis.blendedCpm.toLocaleString()}`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "rgba(255,255,255,0.55)" }}>1,000회 노출 단가</p>
                </div>
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>도달인 추정</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0d1b2e" }}>
                    {plannerKpis.reach > 0
                      ? `${(plannerKpis.reach / 10000).toFixed(1)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#94a3b8" }}>총 노출 ÷ 빈도</p>
                </div>
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>총 추정 노출</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0d1b2e" }}>
                    {plannerKpis.totalImp > 0
                      ? `${(plannerKpis.totalImp / 10000).toLocaleString()}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#94a3b8" }}>실측+추정 합산</p>
                </div>
                <div style={{ background: "#fff7ed", borderRadius: "12px", padding: "14px", border: "1px solid #fed7aa" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#9a3412", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>ROI 효율</p>
                  <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#9a3412" }}>
                    {plannerKpis.roiExpected != null
                      ? `${(plannerKpis.roiExpected / 10000).toFixed(0)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "9px", color: "#9a3412", opacity: 0.85 }}>1억당 노출 환산</p>
                </div>
              </div>
            </div>
          )}

          {/* 매체별 효율 표 (CPM 비교) */}
          {mediaEfficiency && mediaEfficiency.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", paddingBottom: "8px", borderBottom: "2px solid #e2e8f0" }}>
                💡 매체별 효율 분석
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["매체", "유형", "기간", "일유동", "추정 CPM"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mediaEfficiency.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0d1b2e" }}>{m.name}</td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{m.type ?? "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{m.days}일</td>
                      <td style={{ padding: "10px 12px", color: "#0d1b2e", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {m.dailyFootTraffic > 0 ? `${m.dailyFootTraffic.toLocaleString()}명` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#c8913c", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {m.cpm != null ? `₩${m.cpm.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "8px 0 0", fontSize: "9px", color: "#94a3b8", textAlign: "right" }}>
                * 매체별 비용은 일수 비율로 안분 추정. 정확한 단가는 견적서 참고.
              </p>
            </div>
          )}

          {/* 유형 / 지역 분포 */}
          {distribution && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
              <div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>
                  📊 유형 분포
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {distribution.types.map(([label, count]) => {
                    const total = stats?.mediaCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} style={{ background: "#f8faff", borderRadius: "8px", padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0d1b2e" }}>{label}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{count}개 · {pct}%</span>
                        </div>
                        <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#c8913c" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>
                  🗺️ 지역 분포
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {distribution.regions.map(([label, count]) => {
                    const total = stats?.mediaCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} style={{ background: "#f8faff", borderRadius: "8px", padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0d1b2e" }}>{label}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{count}개 · {pct}%</span>
                        </div>
                        <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#0d1b2e" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  <tr style={{ background: "#0d1b2e", color: "#ffffff" }}>
                    {["매체명", "위치", "집행 기간", "일 유동인구", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mediaBookings.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8faff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0d1b2e" }}>{b.mediaName}</td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>{b.location}</td>
                      <td style={{ padding: "10px 12px", color: "#475569", fontSize: "11px" }}>
                        {fmtDate(b.startsAt)} ~ {fmtDate(b.endsAt)}
                        <span style={{ color: "#94a3b8", marginLeft: "4px" }}>({diffDays(b.startsAt, b.endsAt)}일)</span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#0d1b2e", fontWeight: 600 }}>
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
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8913c", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#0d1b2e" }}>{e.title}</span>
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
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0d1b2e" }}>{f.title}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0d1b2e" }}>{f.amountKrw ? fmtAmount(f.amountKrw) : "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: "11px", color: "#64748b" }}>{f.status}</td>
                    </tr>
                  ))}
                  {totalAmount > 0 && (
                    <tr style={{ background: "#0d1b2e" }}>
                      <td colSpan={2} style={{ padding: "10px 12px", color: "#c8913c", fontWeight: 700, fontSize: "12px" }}>합계</td>
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

          {/* 핵심 인사이트 (Planner 스타일) */}
          {plannerKpis && stats && (
            <div style={{
              marginBottom: "28px",
              background: "linear-gradient(135deg, rgba(200,145,60,0.08), rgba(13,27,46,0.04))",
              borderRadius: "14px",
              border: "1px solid rgba(200,145,60,0.25)",
              padding: "20px 24px",
            }}>
              <h2 style={{ fontSize: "12px", fontWeight: 700, color: "#0d1b2e", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#c8913c", color: "#0d1b2e", borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: 800 }}>KEY INSIGHT</span>
                캠페인 종합 평가
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li style={{ fontSize: "12px", color: "#0d1b2e", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#c8913c", fontWeight: 800 }}>·</span>
                  총 <strong>{stats.mediaCount}개 매체</strong>를 <strong>{stats.totalDays}일간</strong> 집행하여 <strong>{(plannerKpis.totalImp / 10000).toLocaleString()}만회</strong>의 노출이 발생할 것으로 추정됩니다.
                </li>
                <li style={{ fontSize: "12px", color: "#0d1b2e", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#c8913c", fontWeight: 800 }}>·</span>
                  <strong>코어 도달률 {plannerKpis.reachCorePct}%</strong>로 약 <strong>{(plannerKpis.reach / 10000).toFixed(1)}만 명</strong>의 잠재 고객에게 메시지가 전달될 것으로 보입니다.
                </li>
                {plannerKpis.blendedCpm != null && (
                  <li style={{ fontSize: "12px", color: "#0d1b2e", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#c8913c", fontWeight: 800 }}>·</span>
                    Blended CPM은 <strong>₩{plannerKpis.blendedCpm.toLocaleString()}</strong>로 OOH 평균 대비 {plannerKpis.blendedCpm < 8000 ? "효율적인" : plannerKpis.blendedCpm < 15000 ? "양호한" : "프리미엄"} 수준입니다.
                  </li>
                )}
                {avgVisibility != null && (
                  <li style={{ fontSize: "12px", color: "#0d1b2e", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#c8913c", fontWeight: 800 }}>·</span>
                    평균 매체 검증 점수 <strong>{avgVisibility} / 4</strong>로 가시성·노출 품질이 검증된 우수 매체 위주로 구성되었습니다.
                  </li>
                )}
                <li style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.6, paddingLeft: "20px", position: "relative", marginTop: "4px" }}>
                  <span style={{ position: "absolute", left: 0, color: "#94a3b8" }}>※</span>
                  본 추정치는 OOH 평균 빈도·인지율을 기반으로 한 가이드 지표이며, 실제 효과는 집행 현장·시기에 따라 달라질 수 있습니다.
                </li>
              </ul>
            </div>
          )}

          {/* 푸터 */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1b2e", margin: "0 0 2px" }}>주식회사 싱커드 (THINKAD)</p>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>mannote@tkad.co.kr · 02-515-2772 · 서울특별시 성동구</p>
            </div>
            <p style={{ fontSize: "10px", color: "#cbd5e1", margin: 0 }}>© 2026 THINKAD. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
