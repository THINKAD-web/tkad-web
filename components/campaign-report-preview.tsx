"use client";

import { useRef, useState } from "react";
import { BtnBlock } from "@/components/brutalist";
import { Camera, Download, Loader2 } from "lucide-react";
import { captureElementAsPng, downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";
import { aggregatePortfolioTraffic } from "@/lib/portfolio-traffic";

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
    /** Media.trafficPattern (있으면 실측·없으면 추정) */
    trafficPattern?: {
      hourly?: number[];
      weekly?: number[];
      monthly?: number[];
    } | null;
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
      <div className="flex gap-0">
        <BtnBlock
          variant="secondary"
          size="sm"
          onClick={handleCapture}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          이미지 저장
        </BtnBlock>
        <BtnBlock
          variant="secondary"
          size="sm"
          onClick={handlePdf}
          disabled={busy}
          className="-ml-[2px]"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          PDF 다운로드
        </BtnBlock>
      </div>

      {/* ───── 보고서 본문 ───── */}
      <div ref={ref} className="bg-white font-sans" style={{ fontFamily: "system-ui, sans-serif", border: "2px solid #000000" }}>

        {/* 헤더 배너 — brutalist */}
        <div style={{ background: "#000000", padding: "32px 40px", borderBottom: "2px solid #000000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: "#FF6600", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ THINKAD · 싱커드 ]
              </p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px", margin: "4px 0 16px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {`// `}OOH 광고 게재 완료 보고서
              </p>
              <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 800, margin: "0 0 6px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {data.campaignName || "캠페인명"}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: 0 }}>
                {[data.clientCompany, data.clientName, data.clientEmail].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ background: "#FF6600", color: "#ffffff", padding: "6px 14px", fontSize: "10px", fontWeight: 800, display: "inline-block", border: "2px solid #FF6600", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 게재 완료 ]
              </div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px", margin: "8px 0 0", textAlign: "right", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.18em" }}>
                {`// `}발행일 {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "32px 40px" }}>

          {/* 캠페인 개요 — brutalist */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              [ 캠페인 개요 ]
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, fontSize: "12px" }}>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 고객사 ]</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 700, color: "#000000" }}>{data.clientCompany || "—"}</p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 담당자 ]</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 700, color: "#000000" }}>{data.clientName || "—"}</p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 이메일 ]</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 600, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{data.clientEmail || "—"}</p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 캠페인 기간 ]</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 700, color: "#000000" }}>{campaignPeriod ?? "—"}</p>
              </div>
              {(data.budgetMin != null || data.budgetMax != null) && (
                <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#000000", border: "2px solid #000000", gridColumn: "span 2" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#FF6600", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 예산 범위 ]</p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 700, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {data.budgetMin != null ? fmtAmount(data.budgetMin) : "—"}
                    {" ~ "}
                    {data.budgetMax != null ? fmtAmount(data.budgetMax) : "—"}
                  </p>
                </div>
              )}
              {data.notes && (
                <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#f5f5f5", border: "2px solid #000000", gridColumn: "span 2" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 비고 ]</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#000000", lineHeight: 1.5 }}>{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 핵심 KPI — brutalist */}
          {(stats || totalAmount > 0) && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 핵심 KPI ]
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                {stats && (<>
                  <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "16px", border: "2px solid #000000", textAlign: "center" }}>
                    <p style={{ fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 집행 매체 ]</p>
                    <p style={{ fontSize: "28px", fontWeight: 800, color: "#000000", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{stats.mediaCount}<span style={{ fontSize: "14px" }}>개</span></p>
                  </div>
                  <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "16px", border: "2px solid #000000", textAlign: "center" }}>
                    <p style={{ fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 집행 기간 ]</p>
                    <p style={{ fontSize: "28px", fontWeight: 800, color: "#000000", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{stats.totalDays}<span style={{ fontSize: "14px" }}>일</span></p>
                  </div>
                  <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#000000", padding: "16px", border: "2px solid #000000", textAlign: "center" }}>
                    <p style={{ fontSize: "10px", color: "#FF6600", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 누적 노출 추정 ]</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "#FF6600", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                      {stats.totalExposure > 0 ? `${Math.round(stats.totalExposure / 10000).toLocaleString()}만` : "—"}
                    </p>
                  </div>
                </>)}
                {totalAmount > 0 && (
                  <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#000000", padding: "16px", border: "2px solid #000000", textAlign: "center" }}>
                    <p style={{ fontSize: "10px", color: "#FF6600", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 총 집행 금액 ]</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "#FF6600", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{fmtAmount(totalAmount)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 부가 KPI — brutalist */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginBottom: "32px" }}>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "14px", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 일평균 유동 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {stats.avgDaily > 0 ? `${stats.avgDaily.toLocaleString()}명` : "—"}
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "14px", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 최장 집행 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {stats.maxDays}일
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "14px", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 평균 검증 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {avgVisibility != null ? `${avgVisibility} / 4` : "—"}
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "14px", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 예상 임프레션 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {stats.totalImpressions > 0
                    ? `${Math.round(stats.totalImpressions / 10000).toLocaleString()}만`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {/* #ADMIN-CAMPAIGNS-1: 효과 분석 — /planner 효과 측정과 동일한 브루탈리스트 톤
              (계산식·KPI 항목·라벨 텍스트는 변경 없음. 디자인 토큰만 통일) */}
          {plannerKpis && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 미디어 효과 분석 ]
              </h2>
              <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#737373", lineHeight: 1.6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {`// `}실측 노출 데이터와 OOH 평균 빈도(주 6회) 가정을 결합한 추정 지표입니다. 캠페인 종료 후 실측 보정 권장.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 코어 도달률 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.reachCorePct}<span style={{ fontSize: "12px", marginLeft: "1px" }}>%</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}전국 5천만 기준</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 확장 도달률 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.reachExtendedPct}<span style={{ fontSize: "12px", marginLeft: "1px" }}>%</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}SNS·온라인 부가 도달</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 평균 빈도 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.avgFrequency}<span style={{ fontSize: "12px", marginLeft: "1px" }}>회/주</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}OOH 평균 노출 빈도</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 일평균 노출 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.dailyImpressionsAvg > 0
                      ? `${(plannerKpis.dailyImpressionsAvg / 10000).toFixed(1)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}예상 일일 노출 합산</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#000000", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#FF6600", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ BLENDED CPM ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.blendedCpm != null
                      ? `₩${plannerKpis.blendedCpm.toLocaleString()}`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}1,000회 노출 단가</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 도달인 추정 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.reach > 0
                      ? `${(plannerKpis.reach / 10000).toFixed(1)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}총 노출 ÷ 빈도</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 총 추정 노출 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.totalImp > 0
                      ? `${(plannerKpis.totalImp / 10000).toLocaleString()}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}실측+추정 합산</p>
                </div>
                <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#000000", border: "2px solid #000000", padding: "16px" }}>
                  <p style={{ margin: 0, fontSize: "10px", color: "#FF6600", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ ROI 효율 ]</p>
                  <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 800, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                    {plannerKpis.roiExpected != null
                      ? `${(plannerKpis.roiExpected / 10000).toFixed(0)}만`
                      : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}1억당 노출 환산</p>
                </div>
              </div>
            </div>
          )}

          {/* 노출 패턴 — 시간대 · 요일 · 월별 (매체 상세와 동일 데이터 소스) */}
          {data.mediaBookings && data.mediaBookings.length > 0 && (
            <CampaignTrafficSection bookings={data.mediaBookings} />
          )}

          {/* 매체별 효율 표 — brutalist */}
          {mediaEfficiency && mediaEfficiency.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 매체별 효율 분석 ]
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#ffffff" }}>
                    {["매체", "유형", "기간", "일유동", "추정 CPM"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", borderRight: "2px solid #ffffff" }}>
                        [ {h} ]
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mediaEfficiency.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "2px solid #000000", background: i % 2 === 0 ? "#ffffff" : "#f5f5f5" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000" }}>{m.name}</td>
                      <td style={{ padding: "10px 12px", color: "#000000" }}>{m.type ?? "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{m.days}일</td>
                      <td style={{ padding: "10px 12px", color: "#000000", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        {m.dailyFootTraffic > 0 ? `${m.dailyFootTraffic.toLocaleString()}명` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#FF6600", fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        {m.cpm != null ? `₩${m.cpm.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "8px 0 0", fontSize: "10px", color: "#737373", textAlign: "right", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {`// `}매체별 비용은 일수 비율로 안분 추정. 정확한 단가는 견적서 참고.
              </p>
            </div>
          )}

          {/* 유형 / 지역 분포 — brutalist */}
          {distribution && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
              <div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  [ 유형 분포 ]
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {distribution.types.map(([label, count]) => {
                    const total = stats?.mediaCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} style={{ marginTop: "-2px", background: "#ffffff", padding: "10px 12px", border: "2px solid #000000" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>{label}</span>
                          <span style={{ fontSize: "11px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{count}개 · {pct}%</span>
                        </div>
                        <div style={{ height: "6px", background: "#f5f5f5", border: "2px solid #000000", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#FF6600" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  [ 지역 분포 ]
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {distribution.regions.map(([label, count]) => {
                    const total = stats?.mediaCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} style={{ marginTop: "-2px", background: "#ffffff", padding: "10px 12px", border: "2px solid #000000" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>{label}</span>
                          <span style={{ fontSize: "11px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{count}개 · {pct}%</span>
                        </div>
                        <div style={{ height: "6px", background: "#f5f5f5", border: "2px solid #000000", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#000000" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 집행 매체 — brutalist */}
          {data.mediaBookings && data.mediaBookings.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 집행 매체 상세 ]
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#FF6600" }}>
                    {["매체명", "위치", "집행 기간", "일 유동인구", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: "10px", color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", borderRight: "2px solid #ffffff" }}>[ {h} ]</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mediaBookings.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f5f5f5", borderBottom: "2px solid #000000" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000" }}>{b.mediaName}</td>
                      <td style={{ padding: "10px 12px", color: "#000000" }}>{b.location}</td>
                      <td style={{ padding: "10px 12px", color: "#000000", fontSize: "11px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        {fmtDate(b.startsAt)} ~ {fmtDate(b.endsAt)}
                        <span style={{ color: "#737373", marginLeft: "4px" }}>({diffDays(b.startsAt, b.endsAt)}일)</span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#000000", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        {b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString()}명` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#FF6600", color: "#ffffff", padding: "3px 10px", fontSize: "10px", fontWeight: 700, border: "2px solid #FF6600", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          [ {b.status} ]
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 게재 사진 — brutalist */}
          {data.proofPhotos && data.proofPhotos.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 게재 증빙 사진 ]
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
                {data.proofPhotos.slice(0, 9).map((p, i) => (
                  <div key={i} style={{ marginTop: "-2px", marginLeft: "-2px", overflow: "hidden", border: "2px solid #000000", background: "#ffffff" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.caption ?? ""} crossOrigin="anonymous"
                      style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
                    {p.caption && (
                      <p style={{ margin: 0, padding: "8px 10px", fontSize: "10px", color: "#000000", background: "#f5f5f5", borderTop: "2px solid #000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}{p.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 진행 일정 — brutalist */}
          {data.scheduleEvents && data.scheduleEvents.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 진행 일정 ]
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {data.scheduleEvents.map((e, i) => (
                  <div key={i} style={{ marginTop: "-2px", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                    <div style={{ width: "8px", height: "8px", background: "#FF6600", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "12px", fontWeight: 700, color: "#000000" }}>{e.title}</span>
                    <span style={{ fontSize: "11px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{fmtDate(e.startsAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 비용 내역 — brutalist */}
          {data.financialDocs && data.financialDocs.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 비용 내역 ]
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000" }}>
                    {["구분", "항목", "금액", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", borderRight: "2px solid #ffffff" }}>[ {h} ]</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.financialDocs.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "2px solid #000000", background: i % 2 === 0 ? "#ffffff" : "#f5f5f5" }}>
                      <td style={{ padding: "10px 12px", color: "#737373", fontSize: "11px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{f.kind}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000" }}>{f.title}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{f.amountKrw ? fmtAmount(f.amountKrw) : "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "11px", color: "#737373" }}>{f.status}</td>
                    </tr>
                  ))}
                  {totalAmount > 0 && (
                    <tr style={{ background: "#000000" }}>
                      <td colSpan={2} style={{ padding: "12px 12px", color: "#FF6600", fontWeight: 700, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 합계 ]</td>
                      <td style={{ padding: "12px 12px", color: "#FF6600", fontWeight: 800, fontSize: "16px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{fmtAmount(totalAmount)}</td>
                      <td style={{ padding: "12px 12px" }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 특이사항 — brutalist */}
          {data.notes && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 특이사항 ]
              </h2>
              <p style={{ background: "#f5f5f5", border: "2px solid #000000", padding: "16px 18px", fontSize: "12px", color: "#000000", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {data.notes}
              </p>
            </div>
          )}

          {/* 핵심 인사이트 — brutalist */}
          {plannerKpis && stats && (
            <div style={{
              marginBottom: "32px",
              background: "#000000",
              border: "2px solid #000000",
              padding: "20px 24px",
            }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.22em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ KEY INSIGHT ] 캠페인 종합 평가
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                <li style={{ fontSize: "12px", color: "#ffffff", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#FF6600", fontWeight: 800 }}>·</span>
                  총 <strong style={{ color: "#FF6600" }}>{stats.mediaCount}개 매체</strong>를 <strong style={{ color: "#FF6600" }}>{stats.totalDays}일간</strong> 집행하여 <strong style={{ color: "#FF6600" }}>{(plannerKpis.totalImp / 10000).toLocaleString()}만회</strong>의 노출이 발생할 것으로 추정됩니다.
                </li>
                <li style={{ fontSize: "12px", color: "#ffffff", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#FF6600", fontWeight: 800 }}>·</span>
                  <strong style={{ color: "#FF6600" }}>코어 도달률 {plannerKpis.reachCorePct}%</strong>로 약 <strong style={{ color: "#FF6600" }}>{(plannerKpis.reach / 10000).toFixed(1)}만 명</strong>의 잠재 고객에게 메시지가 전달될 것으로 보입니다.
                </li>
                {plannerKpis.blendedCpm != null && (
                  <li style={{ fontSize: "12px", color: "#ffffff", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#FF6600", fontWeight: 800 }}>·</span>
                    Blended CPM은 <strong style={{ color: "#FF6600" }}>₩{plannerKpis.blendedCpm.toLocaleString()}</strong>로 OOH 평균 대비 {plannerKpis.blendedCpm < 8000 ? "효율적인" : plannerKpis.blendedCpm < 15000 ? "양호한" : "프리미엄"} 수준입니다.
                  </li>
                )}
                {avgVisibility != null && (
                  <li style={{ fontSize: "12px", color: "#ffffff", lineHeight: 1.65, paddingLeft: "20px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#FF6600", fontWeight: 800 }}>·</span>
                    평균 매체 검증 점수 <strong style={{ color: "#FF6600" }}>{avgVisibility} / 4</strong>로 가시성·노출 품질이 검증된 우수 매체 위주로 구성되었습니다.
                  </li>
                )}
                <li style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, paddingLeft: "20px", position: "relative", marginTop: "6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  <span style={{ position: "absolute", left: 0 }}>※</span>
                  {`// `}본 추정치는 OOH 평균 빈도·인지율 기반 가이드 지표. 실제 효과는 집행 현장·시기에 따라 달라질 수 있습니다.
                </li>
              </ul>
            </div>
          )}

          {/* 푸터 — brutalist */}
          <div style={{ borderTop: "2px solid #000000", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#000000", margin: "0 0 4px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ THINKAD · 싱커드 ]</p>
              <p style={{ fontSize: "10px", color: "#737373", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}mannote@tkad.co.kr · 02-515-2772 · 서울특별시 성동구</p>
            </div>
            <p style={{ fontSize: "10px", color: "#737373", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}© 2026 THINKAD. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  );
}


const CAMP_HOUR_LABELS = ["0", "3", "6", "9", "12", "15", "18", "21"];
const CAMP_WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];
const CAMP_MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function indexOfMaxArr(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}

/** 캠페인 보고서용 시간대·요일·월별 노출 패턴 — html2canvas 호환 div 막대 */
function CampaignTrafficSection({
  bookings,
}: {
  bookings: NonNullable<CampaignReportData["mediaBookings"]>;
}) {
  const agg = aggregatePortfolioTraffic(
    bookings.map((b) => ({
      type: b.type ?? "digital",
      region: b.region ?? "national",
      dailyFootTraffic: b.dailyFootTraffic ?? 0,
      trafficPattern: b.trafficPattern ?? null,
    })),
  );
  const peakHour = indexOfMaxArr(agg.hourly);
  const peakDay = indexOfMaxArr(agg.weekly);
  const peakMonth = indexOfMaxArr(agg.monthly);

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 0 12px" }}>
        <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          [ 노출 패턴 (시간대 · 요일 · 월별) ]
        </h2>
        {!agg.allReal && (
          <span style={{ background: "#FF6600", color: "#ffffff", padding: "3px 10px", fontSize: "10px", fontWeight: 700, border: "2px solid #FF6600", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            [ 일부 추정 ]
          </span>
        )}
      </div>
      <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#737373", lineHeight: 1.6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
        {`// `}매체 상세의 일유동 데이터(또는 매체유형·지역 기반 추정)를 가중평균한 캠페인 전체의 노출 패턴.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
        <CampaignTrafficBlock
          title="시간대 (24h)"
          values={agg.hourly}
          labels={Array.from({ length: 24 }, (_, i) => (CAMP_HOUR_LABELS.includes(String(i)) ? String(i) : ""))}
          peakIdx={peakHour}
          peakLabel={`피크 ${peakHour}시`}
        />
        <CampaignTrafficBlock
          title="요일"
          values={agg.weekly}
          labels={[...CAMP_WEEKDAY_KO]}
          peakIdx={peakDay}
          peakLabel={`피크 ${CAMP_WEEKDAY_KO[peakDay]}요일`}
        />
        <CampaignTrafficBlock
          title="월별 (1~12월)"
          values={agg.monthly}
          labels={[...CAMP_MONTH_LABELS]}
          peakIdx={peakMonth}
          peakLabel={`피크 ${CAMP_MONTH_LABELS[peakMonth]}월`}
        />
      </div>
    </div>
  );
}

function CampaignTrafficBlock({
  title,
  values,
  labels,
  peakIdx,
  peakLabel,
}: {
  title: string;
  values: number[];
  labels: string[];
  peakIdx: number;
  peakLabel: string;
}) {
  const max = Math.max(...values, 0.0001);
  return (
    <div style={{ marginTop: "-2px", marginLeft: "-2px", background: "#ffffff", padding: "12px 14px", border: "2px solid #000000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#000000", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ {title} ]</p>
        <span style={{ background: "#000000", color: "#FF6600", padding: "2px 8px", fontSize: "9px", fontWeight: 700, border: "2px solid #000000", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {peakLabel}
        </span>
      </div>
      <div style={{ display: "flex", height: "60px", alignItems: "flex-end", gap: "2px" }}>
        {values.map((v, i) => {
          const h = (v / max) * 100;
          const isPeak = i === peakIdx;
          return (
            <div key={i} style={{ flex: 1, height: `${Math.max(2, h)}%`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: isPeak ? "#FF6600" : "#000000" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", height: "12px", marginTop: "4px", gap: "2px" }}>
        {labels.map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "8px", fontWeight: 500, color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{label}</div>
        ))}
      </div>
    </div>
  );
}
