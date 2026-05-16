"use client";

import { forwardRef } from "react";
import { aggregatePortfolioTraffic } from "@/lib/portfolio-traffic";
import {
  formatFinancialDocKindKo,
  formatFinancialDocStatusKo,
} from "@/lib/campaign-report-labels";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import { PlannerDailyReachBarChart, PlannerReachDonutChart } from "@/components/planner-charts";
import {
  computeCampaignBaseStats,
  computeCampaignPlannerKpis,
  computeCampaignTotalAmount,
  computeAvgVisibility,
} from "@/lib/campaign-kpis";

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
    /** 매체 `image` — 미리보기 썸네일 */
    imageUrl?: string | null;
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

function fmtShort(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function fmtAmount(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

const SCHEDULE_KIND_KO: Record<string, string> = {
  broadcast: "송출",
  install: "설치",
  removal: "철거",
  meeting: "미팅",
  other: "기타",
};

function scheduleKindKo(kind: string): string {
  const k = kind.trim().toLowerCase();
  return SCHEDULE_KIND_KO[k] ?? kind;
}

function thumbUrl(m: Partial<MediaItem> & { imageUrl?: string | null }): string | null {
  // Prefer explicit imageUrl if provided; otherwise use existing media helpers (if shape matches).
  if (m.imageUrl) return m.imageUrl;
  try {
    // MediaItem shape in this file is partial (from bookings), so guard.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyM = m as any as MediaItem;
    return getPrimaryMediaImageUrl(anyM) ?? resolveMediaGallery(anyM)[0] ?? null;
  } catch {
    return null;
  }
}

const CampaignReportPreview = forwardRef<HTMLDivElement, { data: CampaignReportData }>(function CampaignReportPreview(
  { data },
  ref,
) {

  // KPI 산식은 lib/campaign-kpis.ts 로 추출 (server PDF 와 공유, 산식 동일).
  const stats = computeCampaignBaseStats(data.mediaBookings);
  const totalAmount2 = computeCampaignTotalAmount(data.financialDocs);
  const plannerKpis = computeCampaignPlannerKpis(stats, totalAmount2);

  // NOTE: 규칙 준수(새 산식/평가/추천 금지)를 위해 "매체별 추정 CPM" 등
  // 추가 계산(안분/추정) 기반 효율 분석 섹션은 표시하지 않습니다.

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

  const avgVisibility = computeAvgVisibility(data.mediaBookings);

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

  const nMedia = data.mediaBookings?.length ?? 0;
  const nSchedule = data.scheduleEvents?.length ?? 0;
  const nProofs = data.proofPhotos?.length ?? 0;
  const nFinancial = data.financialDocs?.length ?? 0;

  const mediaThumbs = (() => {
    const raw = data.mediaBookings ?? [];
    // Try to find any plausible image URL on the booking object itself (if present).
    const urls: string[] = [];
    for (const b of raw) {
      const u =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b as any)?.imageUrl ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b as any)?.thumbnailUrl ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b as any)?.media?.imageUrl ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b as any)?.media?.image ??
        null;
      if (typeof u === "string" && u.startsWith("http")) urls.push(u);
      else {
        const fallback = thumbUrl(b as unknown as Partial<MediaItem>);
        if (fallback) urls.push(fallback);
      }
    }
    // Dedupe
    return Array.from(new Set(urls)).slice(0, 9);
  })();

  const dashboardBars = (() => {
    const bookings = data.mediaBookings ?? [];
    const byType = new Map<string, number>();
    const byRegion = new Map<string, number>();
    for (const b of bookings) {
      const t = (b.type ?? "기타").toString();
      const r = (b.region ?? b.location?.split(" ")[0] ?? "-").toString();
      const daily = b.dailyFootTraffic ?? 0;
      byType.set(t, (byType.get(t) ?? 0) + daily);
      byRegion.set(r, (byRegion.get(r) ?? 0) + 1);
    }
    const typeBars = Array.from(byType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ key: k, label: k, value: v }));
    const regionBars = Array.from(byRegion.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ key: k, label: k, value: v }));
    return { typeBars, regionBars };
  })();

  const topMediaBars = (() => {
    const bookings = data.mediaBookings ?? [];
    const foot = bookings
      .filter((b) => typeof b.dailyFootTraffic === "number" && (b.dailyFootTraffic ?? 0) > 0)
      .sort((a, b) => (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0))
      .slice(0, 6)
      .map((b, i) => ({
        key: `${b.mediaName}-${i}`,
        label: (b.mediaName ?? "—").slice(0, 10),
        value: b.dailyFootTraffic ?? 0,
      }));
    const imp = bookings
      .filter((b) => typeof b.impressions === "number" && (b.impressions ?? 0) > 0)
      .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
      .slice(0, 6)
      .map((b, i) => ({
        key: `${b.mediaName}-${i}`,
        label: (b.mediaName ?? "—").slice(0, 10),
        value: b.impressions ?? 0,
      }));
    return { foot, imp };
  })();

  const opsBars = (() => {
    const bookings = data.mediaBookings ?? [];
    const byBookingStatus = new Map<string, number>();
    const byDocStatus = new Map<string, number>();
    const visibilityTop = bookings
      .filter((b) => typeof b.visibilityScore === "number" && (b.visibilityScore ?? 0) > 0)
      .sort((a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0))
      .slice(0, 6)
      .map((b, i) => ({
        key: `${b.mediaName}-${i}`,
        label: (b.mediaName ?? "—").slice(0, 10),
        value: b.visibilityScore ?? 0,
      }));

    for (const b of bookings) {
      const k = (b.status ?? "—").toString();
      byBookingStatus.set(k, (byBookingStatus.get(k) ?? 0) + 1);
    }
    for (const d of data.financialDocs ?? []) {
      const k = `${d.kind ?? "DOC"} · ${d.status ?? "—"}`;
      byDocStatus.set(k, (byDocStatus.get(k) ?? 0) + 1);
    }
    const bookingStatusBars = Array.from(byBookingStatus.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ key: k, label: k.slice(0, 10), value: v }));
    const docStatusBars = Array.from(byDocStatus.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ key: k, label: k.slice(0, 10), value: v }));

    return { bookingStatusBars, docStatusBars, visibilityTop };
  })();

  const scheduleBars = (() => {
    const byKind = new Map<string, number>();
    for (const e of data.scheduleEvents ?? []) {
      const k = (e.kind ?? "EVENT").toString();
      byKind.set(k, (byKind.get(k) ?? 0) + 1);
    }
    const kindBars = Array.from(byKind.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ key: k, label: k.slice(0, 10), value: v }));
    return { kindBars };
  })();

  const bookingMonthBars = (() => {
    const bookings = data.mediaBookings ?? [];
    const buckets = new Array(12).fill(0) as number[];
    for (const b of bookings) {
      const d = new Date(b.startsAt);
      if (Number.isNaN(d.getTime())) continue;
      const m = d.getMonth(); // 0~11
      buckets[m] += 1;
    }
    const bars = buckets
      .map((v, i) => ({ key: String(i + 1), label: `${i + 1}월`, value: v }))
      .filter((p) => p.value > 0);
    return { bars };
  })();

  const timeline = (() => {
    const bookings = (data.mediaBookings ?? []).filter(Boolean);
    if (bookings.length === 0) return null;
    const points = bookings
      .map((b) => ({
        ...b,
        s: new Date(b.startsAt).getTime(),
        e: new Date(b.endsAt).getTime(),
      }))
      .filter((x) => Number.isFinite(x.s) && Number.isFinite(x.e) && x.e >= x.s);
    if (points.length === 0) return null;
    const minS = Math.min(...points.map((p) => p.s));
    const maxE = Math.max(...points.map((p) => p.e));
    const span = Math.max(1, maxE - minS);
    const rows = points
      .sort((a, b) => a.s - b.s)
      .slice(0, 14)
      .map((p, idx) => {
        const left = ((p.s - minS) / span) * 100;
        const width = ((p.e - p.s) / span) * 100;
        return {
          key: `${p.mediaName}-${idx}`,
          label: (p.mediaName ?? "—").slice(0, 18),
          left,
          width: Math.max(1.2, width),
          startsAt: p.startsAt,
          endsAt: p.endsAt,
        };
      });
    return {
      minLabel: fmtShort(new Date(minS).toISOString()),
      maxLabel: fmtShort(new Date(maxE).toISOString()),
      rows,
      total: points.length,
    };
  })();

  return (
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
              <div style={{ background: "#FF6600", color: "#ffffff", padding: "6px 14px", fontSize: "10px", fontWeight: 800, display: "inline-block", border: "2px solid #FF6600", letterSpacing: "0.12em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", maxWidth: "200px" }}>
                [ {data.status || "—"} ]
              </div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px", margin: "8px 0 0", textAlign: "right", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.18em" }}>
                {`// `}발행일 {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "32px 40px" }}>

          {/* 집행 스냅샷 — PDF 요약과 같은 데이터 축을 한눈에 */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              [ 집행 스냅샷 ]
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 집행 매체 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {nMedia}
                  <span style={{ marginLeft: "4px", fontSize: "12px", color: "#737373" }}>개</span>
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#000000", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#FF6600", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 송출 일정 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 800, color: "#FF6600", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {nSchedule}
                  <span style={{ marginLeft: "4px", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>건</span>
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 증빙 사진 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {nProofs}
                  <span style={{ marginLeft: "4px", fontSize: "12px", color: "#737373" }}>장</span>
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#ffffff", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 재무 문서 ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 800, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                  {nFinancial}
                  <span style={{ marginLeft: "4px", fontSize: "12px", color: "#737373" }}>건</span>
                </p>
              </div>
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: campaignPeriod ? "#000000" : "#ffffff", border: "2px solid #000000", gridColumn: "span 2" }}>
                <p style={{ margin: 0, fontSize: "10px", color: campaignPeriod ? "#FF6600" : "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 캠페인·집행 기간(요약) ]</p>
                <p style={{ margin: "6px 0 0", fontSize: "13px", fontWeight: 800, lineHeight: 1.4, color: campaignPeriod ? "#FF6600" : "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {campaignPeriod ?? "캘린더 일정·매체 기간이 없으면 미정"}
                </p>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "10px", color: "#737373", lineHeight: 1.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {`// `}KPI·차트·하단 표는 이 스냅샷과 동일 DB 기준이며,「완료 보고서 PDF」와 맞춰 점검할 수 있습니다.
            </p>
          </div>

          {/* 캠페인 개요 (연락·예산) — 상단 */}
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
              <div style={{ marginTop: "-2px", marginLeft: "-2px", padding: "12px 14px", background: "#f5f5f5", border: "2px solid #000000" }}>
                <p style={{ margin: 0, fontSize: "10px", color: "#737373", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ 캠페인 기간(등록) ]</p>
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
            </div>
          </div>

          {/* Visual hero strip (media + proof) — preview only */}
          {(mediaThumbs.length > 0 || (data.proofPhotos?.length ?? 0) > 0) && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ VISUAL HIGHLIGHTS ]
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0 }}>
                {[
                  ...mediaThumbs.slice(0, 6).map((u) => ({ url: u, tag: "MEDIA" })),
                  ...(data.proofPhotos ?? []).slice(0, Math.max(0, 6 - mediaThumbs.slice(0, 6).length)).map((p) => ({ url: p.imageUrl, tag: "PROOF" })),
                ].slice(0, 6).map((x, i) => (
                  <div
                    key={`${x.tag}-${i}`}
                    style={{
                      marginTop: "-2px",
                      marginLeft: "-2px",
                      border: "2px solid #000000",
                      background: "#ffffff",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={x.url}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        background: "#000000",
                        color: "#FF6600",
                        borderRight: "2px solid #000000",
                        borderBottom: "2px solid #000000",
                        padding: "4px 8px",
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.18em",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      [ {x.tag} ]
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {`// `}미리보기에서는 집행 매체/증빙 이미지를 우선 노출합니다. (데이터가 없으면 생략)
              </p>
            </div>
          )}

          {/* Executive Summary — /planner 톤의 컴팩트 대시보드 (기존 KPI만 재배치) */}
          {(stats || plannerKpis || totalAmount > 0) && (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ EXECUTIVE SUMMARY ]
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                {[
                  {
                    label: "집행 매체",
                    value: stats ? `${stats.mediaCount}` : "—",
                    suffix: "개",
                    invert: false,
                  },
                  {
                    label: "집행 기간",
                    value: stats ? `${stats.totalDays}` : "—",
                    suffix: "일",
                    invert: false,
                  },
                  {
                    label: "총 노출",
                    value: plannerKpis ? `${(plannerKpis.totalImp / 10000).toLocaleString()}만` : "—",
                    suffix: "회",
                    invert: true,
                  },
                  {
                    label: "도달인 추정",
                    value: plannerKpis ? `${(plannerKpis.reach / 10000).toFixed(1)}만` : "—",
                    suffix: "명",
                    invert: false,
                  },
                  {
                    label: "코어 도달률",
                    value: plannerKpis ? `${plannerKpis.reachCorePct}` : "—",
                    suffix: "%",
                    invert: false,
                  },
                  {
                    label: "확장 도달률",
                    value: plannerKpis ? `${plannerKpis.reachExtendedPct}` : "—",
                    suffix: "%",
                    invert: false,
                  },
                  {
                    label: "BLENDED CPM",
                    value:
                      plannerKpis?.blendedCpm != null
                        ? `₩${plannerKpis.blendedCpm.toLocaleString()}`
                        : "—",
                    suffix: " / 1,000",
                    invert: true,
                  },
                  {
                    label: "ROI 효율",
                    value:
                      plannerKpis?.roiExpected != null
                        ? `${(plannerKpis.roiExpected / 10000).toFixed(0)}만`
                        : "—",
                    suffix: "회/1억",
                    invert: true,
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{
                      marginTop: "-2px",
                      marginLeft: "-2px",
                      background: c.invert ? "#000000" : "#ffffff",
                      border: "2px solid #000000",
                      padding: "14px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.22em",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        color: c.invert ? "#FF6600" : "#737373",
                      }}
                    >
                      [ {c.label} ]
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: "20px",
                        fontWeight: 800,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: c.invert ? "#FF6600" : "#000000",
                      }}
                    >
                      {c.value}
                      {c.suffix ? (
                        <span
                          style={{
                            marginLeft: "4px",
                            fontSize: "10px",
                            color: c.invert ? "rgba(255,255,255,0.55)" : "#737373",
                            fontWeight: 700,
                          }}
                        >
                          {c.suffix}
                        </span>
                      ) : null}
                    </p>
                  </div>
                ))}
                {totalAmount > 0 && (
                  <div
                    style={{
                      marginTop: "-2px",
                      marginLeft: "-2px",
                      background: "#000000",
                      border: "2px solid #000000",
                      padding: "14px",
                      gridColumn: "span 4",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "10px",
                        color: "#FF6600",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.22em",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      [ 총 집행 금액 ]
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "#FF6600",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtAmount(totalAmount)}
                    </p>
                  </div>
                )}
              </div>

              {distribution?.types?.length ? (
                <div style={{ marginTop: "16px" }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "10px",
                      color: "#737373",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    [ 매체 유형 분포 (요약) ]
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {distribution.types.slice(0, 6).map(([label, count], i) => {
                      const total = stats?.mediaCount ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div
                          key={label}
                          style={{
                            marginTop: "-2px",
                            background: "#ffffff",
                            padding: "10px 12px",
                            border: "2px solid #000000",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>{label}</span>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#737373",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {count}개 · {pct}%
                            </span>
                          </div>
                          <div style={{ height: "6px", background: "#f5f5f5", border: "2px solid #000000", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#FF6600" : "#000000" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* EFFECT DASHBOARD (charts) — planner chart components reused */}
          {plannerKpis && (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ EFFECT DASHBOARD ]
              </h2>
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 도달 구조 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerReachDonutChart
                      corePct={plannerKpis.reachCorePct}
                      extendedPct={plannerKpis.reachExtendedPct}
                      title="도달 구조"
                      coreLabel="Core"
                      extendedLabel="Extended"
                    />
                  </div>
                </div>
                <div className="-ml-[2px] border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 유형별 일유동 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={dashboardBars.typeBars}
                      title="유형별 일유동(합산)"
                      valueLabel="daily"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 border-2 border-border bg-card">
                <div className="border-b-2 border-border p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    [ 지역 분포 ]
                  </p>
                </div>
                <div className="p-4">
                  <PlannerDailyReachBarChart
                    data={dashboardBars.regionBars}
                    title="지역별 집행 매체 수"
                    valueLabel="count"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 노출 패턴 — 24h/weekday/monthly (브루탈 막대, html2canvas 안정) */}
          {data.mediaBookings?.length ? (
            <CampaignTrafficSection bookings={data.mediaBookings} />
          ) : null}

          {/* TOP MEDIA (bars) */}
          {(topMediaBars.foot.length > 0 || topMediaBars.imp.length > 0) && (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ TOP MEDIA (DATA) ]
              </h2>
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 매체별 일유동 TOP ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={topMediaBars.foot}
                      title="매체별 일유동(상위)"
                      valueLabel="daily"
                    />
                  </div>
                </div>
                <div className="-ml-[2px] border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 매체별 노출 TOP ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={topMediaBars.imp}
                      title="매체별 노출(상위)"
                      valueLabel="impressions"
                    />
                  </div>
                </div>
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "10px",
                  color: "#737373",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {`// `}일유동/노출 값이 없는 매체는 차트에서 자동으로 제외됩니다.
              </p>
            </div>
          )}

          {/* OPERATIONS (more charts, no new KPIs) */}
          {(opsBars.bookingStatusBars.length > 0 ||
            opsBars.docStatusBars.length > 0 ||
            opsBars.visibilityTop.length > 0) && (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ OPERATIONS DASHBOARD ]
              </h2>
              <div className="grid gap-0 lg:grid-cols-3">
                <div className="border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 예약 상태 분포 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={opsBars.bookingStatusBars}
                      title="예약 상태(매체 수)"
                      valueLabel="count"
                    />
                  </div>
                </div>
                <div className="-ml-[2px] border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 문서 상태 분포 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={opsBars.docStatusBars}
                      title="문서 상태(건수)"
                      valueLabel="count"
                    />
                  </div>
                </div>
                <div className="-ml-[2px] border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 가시성 TOP ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={opsBars.visibilityTop}
                      title="가시성 점수(상위)"
                      valueLabel="score"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDULE (more charts) */}
          {(scheduleBars.kindBars.length > 0 || bookingMonthBars.bars.length > 0) && (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ SCHEDULE DASHBOARD ]
              </h2>
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 일정 이벤트 종류 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={scheduleBars.kindBars}
                      title="일정 이벤트(종류별)"
                      valueLabel="count"
                    />
                  </div>
                </div>
                <div className="-ml-[2px] border-2 border-border bg-card">
                  <div className="border-b-2 border-border p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 매체 시작 월 ]
                    </p>
                  </div>
                  <div className="p-4">
                    <PlannerDailyReachBarChart
                      data={bookingMonthBars.bars}
                      title="집행 시작 월(매체 수)"
                      valueLabel="count"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE (gantt-style) */}
          {timeline?.rows.length ? (
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF6600",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  margin: "0 0 12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                [ TIMELINE (MEDIA) ]
              </h2>
              <div className="border-2 border-border bg-card">
                <div className="border-b-2 border-border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 매체 집행 타임라인 ]
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {`// `}표시: {timeline.rows.length}/{timeline.total} · {timeline.minLabel} → {timeline.maxLabel}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {timeline.rows.map((r) => (
                      <div key={r.key} className="grid grid-cols-[160px_1fr] gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[10px] font-bold text-foreground">
                            {r.label}
                          </p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            {fmtShort(r.startsAt)} ~ {fmtShort(r.endsAt)}
                          </p>
                        </div>
                        <div className="relative h-8 border-2 border-border bg-[#f5f5f5]">
                          <div
                            className="absolute top-0 h-full border-r-2 border-border bg-hero-void"
                            style={{
                              left: `${Math.max(0, Math.min(98.8, r.left))}%`,
                              width: `${Math.max(1.2, Math.min(100, r.width))}%`,
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, rgba(0,0,0,0.10) 1px, transparent 1px)",
                              backgroundSize: "10% 100%",
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                    {`// `}집행 시작/종료 일자를 막대로만 표시합니다. (추가 계산/평가 없음)
                  </p>
                </div>
              </div>
            </div>
          ) : null}

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

          {/* 집행 매체 — brutalist */}
          {data.mediaBookings && data.mediaBookings.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#FF6600", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                [ 집행 매체 상세 ]
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#FF6600" }}>
                    {["매체명", "유형", "지역", "위치", "집행 기간", "일 유동", "가시성", "상태"].map((h, hi) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 8px",
                          textAlign: "left",
                          fontWeight: 700,
                          fontSize: "9px",
                          color: "#FF6600",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          borderRight: hi < 7 ? "2px solid #ffffff" : undefined,
                        }}
                      >
                        [ {h} ]
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mediaBookings.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f5f5f5", borderBottom: "2px solid #000000" }}>
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: "#000000", maxWidth: "120px" }}>{b.mediaName}</td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontSize: "10px" }}>{b.type ?? "—"}</td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontSize: "10px" }}>{b.region ?? "—"}</td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontSize: "10px" }}>{b.location}</td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontSize: "10px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        {fmtDate(b.startsAt)} ~ {fmtDate(b.endsAt)}
                        <span style={{ color: "#737373", marginLeft: "2px" }}>({diffDays(b.startsAt, b.endsAt)}일)</span>
                      </td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums", fontSize: "10px" }}>
                        {b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums", fontSize: "10px" }}>
                        {b.visibilityScore != null && b.visibilityScore > 0 ? `${b.visibilityScore} / 4` : "—"}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{ background: "#FF6600", color: "#ffffff", padding: "2px 6px", fontSize: "9px", fontWeight: 700, border: "2px solid #FF6600", letterSpacing: "0.1em", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "8px 0 0", fontSize: "10px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {`// `}가시성은 매체 DB 점수(0~4) 기준. 유형·지역은 Media 메타이며, PDF 본문 표와 동일 맥락입니다.
              </p>
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
                  <div
                    key={i}
                    style={{
                      marginTop: "-2px",
                      padding: "10px 14px",
                      background: "#ffffff",
                      border: "2px solid #000000",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ width: "8px", height: "8px", background: "#FF6600", flexShrink: 0, marginTop: "4px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#000000" }}>{e.title}</span>
                          <span
                            style={{
                              background: "#000000",
                              color: "#FF6600",
                              padding: "2px 8px",
                              fontSize: "9px",
                              fontWeight: 700,
                              letterSpacing: "0.12em",
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}
                          >
                            {scheduleKindKo(e.kind || "—")}
                          </span>
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                          {fmtDate(e.startsAt)} — {fmtDate(e.endsAt)}
                        </p>
                      </div>
                    </div>
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
                      <td style={{ padding: "10px 12px", color: "#737373", fontSize: "11px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{formatFinancialDocKindKo(f.kind)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000" }}>{f.title}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#000000", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>{f.amountKrw ? fmtAmount(f.amountKrw) : "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "11px", color: "#737373" }}>{formatFinancialDocStatusKo(f.status)}</td>
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

          {/* 게재 증빙 사진 — 일정·비용 뒤에 배치 (사실 → 증빙 흐름) */}
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

          {/* (규칙) 평가/인사이트 자동 생성 섹션 제거 */}

          {/* 푸터 — brutalist */}
          <div style={{ borderTop: "2px solid #000000", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#000000", margin: "0 0 4px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>[ THINKAD · 싱커드 ]</p>
              <p style={{ fontSize: "10px", color: "#737373", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}{CONTACT_EMAIL} · 02-515-2772 · 서울특별시 성동구</p>
            </div>
            <p style={{ fontSize: "10px", color: "#737373", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{`// `}© 2026 THINKAD. All rights reserved.</p>
          </div>

        </div>
      </div>
  );
});

CampaignReportPreview.displayName = "CampaignReportPreview";

export default CampaignReportPreview;

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
