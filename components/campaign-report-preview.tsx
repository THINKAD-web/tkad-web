"use client";

import { CONTACT_EMAIL } from "@/lib/constants";
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
import {
  computeCampaignPredictionVariance,
  formatImpressionsCompact,
  formatVariancePct,
} from "@/lib/prediction-accuracy";
import {
  CampaignReportDocument,
  CampaignReportHero,
  ReportBody,
  ReportSection,
  SectionTitle,
  SectionNote,
  StatGrid,
  StatCard,
  NeonBadge,
  InfoGrid,
  InfoCell,
  StatCardFootnote,
  ThumbGrid,
  NeonTable,
  NotesBox,
  ChartGrid,
  ChartCard,
  DistBar,
  ReportFooter,
  ReportPanel,
} from "@/components/campaign-report/neon-ui";
import { cn } from "@/lib/utils";

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
  const predictionVariance = computeCampaignPredictionVariance(
    data.mediaBookings,
    data.proofPhotos?.length ?? 0,
  );

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
    <CampaignReportDocument ref={ref}>
      <CampaignReportHero
        campaignName={data.campaignName}
        clientLine={[data.clientCompany, data.clientName, data.clientEmail].filter(Boolean).join(" · ")}
        status={data.status}
      />
      <ReportBody>

          <ReportSection>
            <SectionTitle>집행 스냅샷</SectionTitle>
            <StatGrid cols={3}>
              <StatCard label="집행 매체" value={nMedia} suffix="개" />
              <StatCard label="송출 일정" value={nSchedule} suffix="건" variant="accent" />
              <StatCard label="증빙 사진" value={nProofs} suffix="장" />
              <StatCard label="재무 문서" value={nFinancial} suffix="건" />
              <StatCard
                label="캠페인·집행 기간(요약)"
                value={campaignPeriod ?? "캘린더 일정·매체 기간이 없으면 미정"}
                variant={campaignPeriod ? "accent" : "muted"}
                className="sm:col-span-2"
              />
            </StatGrid>
            <SectionNote>KPI·차트·하단 표는 이 스냅샷과 동일 DB 기준이며,「완료 보고서 PDF」와 맞춰 점검할 수 있습니다.</SectionNote>
          </ReportSection>

          <ReportSection>
            <SectionTitle>캠페인 개요</SectionTitle>
            <InfoGrid>
              <InfoCell label="고객사">{data.clientCompany || "—"}</InfoCell>
              <InfoCell label="담당자">{data.clientName || "—"}</InfoCell>
              <InfoCell label="이메일">{data.clientEmail || "—"}</InfoCell>
              <InfoCell label="캠페인 기간(등록)">{campaignPeriod ?? "—"}</InfoCell>
              {(data.budgetMin != null || data.budgetMax != null) && (
                <InfoCell label="예산 범위" variant="accent" className="sm:col-span-2">
                  {data.budgetMin != null ? fmtAmount(data.budgetMin) : "—"}
                  {" ~ "}
                  {data.budgetMax != null ? fmtAmount(data.budgetMax) : "—"}
                </InfoCell>
              )}
            </InfoGrid>
          </ReportSection>

          {(mediaThumbs.length > 0 || (data.proofPhotos?.length ?? 0) > 0) && (
            <ReportSection>
              <SectionTitle>Visual highlights</SectionTitle>
              <ThumbGrid
                items={[
                  ...mediaThumbs.slice(0, 6).map((u) => ({ url: u, tag: "MEDIA" })),
                  ...(data.proofPhotos ?? [])
                    .slice(0, Math.max(0, 6 - mediaThumbs.slice(0, 6).length))
                    .map((p) => ({ url: p.imageUrl, tag: "PROOF" })),
                ].slice(0, 6)}
              />
              <SectionNote>미리보기에서는 집행 매체/증빙 이미지를 우선 노출합니다. (데이터가 없으면 생략)</SectionNote>
            </ReportSection>
          )}

          {/* Executive Summary — /planner 톤의 컴팩트 대시보드 (기존 KPI만 재배치) */}
          {(stats || plannerKpis || totalAmount > 0) && (
            <ReportSection>
              <SectionTitle>EXECUTIVE SUMMARY</SectionTitle>

              <StatGrid cols={4}>
                {[
                  {
                    label: "집행 매체",
                    value: stats ? `${stats.mediaCount}` : "—",
                    suffix: "개",
                    variant: "default" as const,
                  },
                  {
                    label: "집행 기간",
                    value: stats ? `${stats.totalDays}` : "—",
                    suffix: "일",
                    variant: "default" as const,
                  },
                  {
                    label: "총 노출",
                    value: plannerKpis ? `${(plannerKpis.totalImp / 10000).toLocaleString()}만` : "—",
                    suffix: "회",
                    variant: "accent" as const,
                  },
                  {
                    label: "도달인 추정",
                    value: plannerKpis ? `${(plannerKpis.reach / 10000).toFixed(1)}만` : "—",
                    suffix: "명",
                    variant: "default" as const,
                  },
                  {
                    label: "코어 도달률",
                    value: plannerKpis ? `${plannerKpis.reachCorePct}` : "—",
                    suffix: "%",
                    variant: "default" as const,
                  },
                  {
                    label: "확장 도달률",
                    value: plannerKpis ? `${plannerKpis.reachExtendedPct}` : "—",
                    suffix: "%",
                    variant: "default" as const,
                  },
                  {
                    label: "BLENDED CPM",
                    value:
                      plannerKpis?.blendedCpm != null
                        ? `₩${plannerKpis.blendedCpm.toLocaleString()}`
                        : "—",
                    suffix: " / 1,000",
                    variant: "accent" as const,
                  },
                  {
                    label: "ROI 효율",
                    value:
                      plannerKpis?.roiExpected != null
                        ? `${(plannerKpis.roiExpected / 10000).toFixed(0)}만`
                        : "—",
                    suffix: "회/1억",
                    variant: "accent" as const,
                  },
                ].map((c) => (
                  <StatCard
                    key={c.label}
                    label={c.label}
                    value={c.value}
                    suffix={c.suffix}
                    variant={c.variant}
                  />
                ))}
                {totalAmount > 0 ? (
                  <StatCard
                    label="총 집행 금액"
                    value={fmtAmount(totalAmount)}
                    variant="accent"
                    className="lg:col-span-4"
                  />
                ) : null}
              </StatGrid>

              {distribution?.types?.length ? (
                <div className="mt-4 space-y-2">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-muted)]">
                    [ 매체 유형 분포 (요약) ]
                  </p>
                  {distribution.types.slice(0, 6).map(([label, count], i) => {
                    const total = stats?.mediaCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <DistBar
                        key={label}
                        label={label}
                        count={count}
                        pct={pct}
                        highlight={i === 0}
                      />
                    );
                  })}
                </div>
              ) : null}
            </ReportSection>
          )}

          {predictionVariance && (
            <ReportSection>
              <SectionTitle>예측 vs 실측</SectionTitle>
              <StatGrid cols={3}>
                <StatCard
                  label="예측 노출"
                  value={formatImpressionsCompact(
                    predictionVariance.predictedImpressions,
                  )}
                  suffix="회"
                />
                <StatCard
                  label="실측 노출"
                  value={formatImpressionsCompact(
                    predictionVariance.actualImpressions,
                  )}
                  suffix="회"
                  variant="accent"
                />
                <StatCard
                  label="오차율"
                  value={formatVariancePct(predictionVariance.variancePct, "ko")}
                  variant={
                    Math.abs(predictionVariance.variancePct) <= 10
                      ? "accent"
                      : "default"
                  }
                />
              </StatGrid>
              <SectionNote>
                {predictionVariance.hasProofData
                  ? "현장 인증 사진·매체 실측 데이터를 반영한 집행 후 노출입니다. 예측 모델(유동 × 0.4)과 비교해 플랫폼 예측 정확도를 누적 개선합니다."
                  : "인증 사진이 업로드되면 실측 노출이 보정·확정됩니다. 현재는 매체 DB 기준 추정치입니다."}
              </SectionNote>
            </ReportSection>
          )}

          {/* EFFECT DASHBOARD (charts) — planner chart components reused */}
          {plannerKpis && (
            <ReportSection>
              <SectionTitle>EFFECT DASHBOARD</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
              <div className="tkad-glass-surface mt-6 overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
            </ReportSection>
          )}

          {/* 노출 패턴 — 24h/weekday/monthly (브루탈 막대, html2canvas 안정) */}
          {data.mediaBookings?.length ? (
            <CampaignTrafficSection bookings={data.mediaBookings} />
          ) : null}

          {/* TOP MEDIA (bars) */}
          {(topMediaBars.foot.length > 0 || topMediaBars.imp.length > 0) && (
            <ReportSection>
              <SectionTitle>TOP MEDIA (DATA)</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                  color: "var(--cr-fg-muted)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {`// `}일유동/노출 값이 없는 매체는 차트에서 자동으로 제외됩니다.
              </p>
            </ReportSection>
          )}

          {/* OPERATIONS (more charts, no new KPIs) */}
          {(opsBars.bookingStatusBars.length > 0 ||
            opsBars.docStatusBars.length > 0 ||
            opsBars.visibilityTop.length > 0) && (
            <ReportSection>
              <SectionTitle>OPERATIONS DASHBOARD</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
            </ReportSection>
          )}

          {/* SCHEDULE (more charts) */}
          {(scheduleBars.kindBars.length > 0 || bookingMonthBars.bars.length > 0) && (
            <ReportSection>
              <SectionTitle>SCHEDULE DASHBOARD</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
                <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                  <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
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
            </ReportSection>
          )}

          {/* TIMELINE (gantt-style) */}
          {timeline?.rows.length ? (
            <ReportSection>
              <SectionTitle>TIMELINE (MEDIA)</SectionTitle>
                            <div className="tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md">
                <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
                      [ 매체 집행 타임라인 ]
                    </p>
                    <p className="text-[10px] text-[color:var(--cr-fg-subtle)]">
                      {`// `}표시: {timeline.rows.length}/{timeline.total} · {timeline.minLabel} → {timeline.maxLabel}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {timeline.rows.map((r) => (
                      <div key={r.key} className="grid grid-cols-[160px_1fr] gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold text-[color:var(--cr-fg)]">
                            {r.label}
                          </p>
                          <p className="text-[9px] text-[color:var(--cr-fg-subtle)]">
                            {fmtShort(r.startsAt)} ~ {fmtShort(r.endsAt)}
                          </p>
                        </div>
                        <div className="relative h-8 border-2 border-[color:var(--cr-border-soft)] bg-[var(--cr-timeline-track)]">
                          <div
                            className="absolute top-0 h-full border-r-2 border-[color:var(--cr-accent-border)] bg-[image:var(--cr-timeline-bar)]"
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
                  <p className="mt-3 text-[10px] text-[color:var(--cr-fg-subtle)]">
                    {`// `}집행 시작/종료 일자를 막대로만 표시합니다. (추가 계산/평가 없음)
                  </p>
                </div>
              </div>
            </ReportSection>
          ) : null}

          {/* 핵심 KPI */}
          {(stats || totalAmount > 0) && (
            <ReportSection>
              <SectionTitle>핵심 KPI</SectionTitle>
              <StatGrid cols={4}>
                {stats ? (
                  <>
                    <StatCard label="집행 매체" value={stats.mediaCount} suffix="개" className="text-center" />
                    <StatCard label="집행 기간" value={stats.totalDays} suffix="일" className="text-center" />
                    <StatCard
                      label="누적 노출 추정"
                      value={
                        stats.totalExposure > 0
                          ? `${Math.round(stats.totalExposure / 10000).toLocaleString()}만`
                          : "—"
                      }
                      variant="accent"
                      className="text-center"
                    />
                  </>
                ) : null}
                {totalAmount > 0 ? (
                  <StatCard label="총 집행 금액" value={fmtAmount(totalAmount)} variant="accent" className="text-center" />
                ) : null}
              </StatGrid>
            </ReportSection>
          )}

          {/* 부가 KPI */}
          {stats && (
            <ReportSection>
              <SectionTitle>부가 KPI</SectionTitle>
              <StatGrid cols={4}>
                <StatCard
                  label="일평균 유동"
                  value={stats.avgDaily > 0 ? `${stats.avgDaily.toLocaleString()}명` : "—"}
                />
                <StatCard label="최장 집행" value={stats.maxDays} suffix="일" />
                <StatCard
                  label="평균 검증"
                  value={avgVisibility != null ? `${avgVisibility} / 4` : "—"}
                />
                <StatCard
                  label="예상 임프레션"
                  value={
                    stats.totalImpressions > 0
                      ? `${Math.round(stats.totalImpressions / 10000).toLocaleString()}만`
                      : "—"
                  }
                />
              </StatGrid>
            </ReportSection>
          )}

          {plannerKpis && (
            <ReportSection>
              <SectionTitle>미디어 효과 분석</SectionTitle>
              <SectionNote>
                실측 노출 데이터와 OOH 평균 빈도(주 6회) 가정을 결합한 추정 지표입니다. 캠페인 종료 후 실측 보정 권장.
              </SectionNote>
              <StatGrid cols={4} className="mt-3">
                <StatCardFootnote label="코어 도달률" value={plannerKpis.reachCorePct} suffix="%" footnote="전국 5천만 기준" variant="accent" />
                <StatCardFootnote label="확장 도달률" value={plannerKpis.reachExtendedPct} suffix="%" footnote="SNS·온라인 부가 도달" variant="accent" />
                <StatCardFootnote label="평균 빈도" value={plannerKpis.avgFrequency} suffix="회/주" footnote="OOH 평균 노출 빈도" />
                <StatCardFootnote
                  label="일평균 노출"
                  value={
                    plannerKpis.dailyImpressionsAvg > 0
                      ? `${(plannerKpis.dailyImpressionsAvg / 10000).toFixed(1)}만`
                      : "—"
                  }
                  footnote="예상 일일 노출 합산"
                />
                <StatCardFootnote
                  label="BLENDED CPM"
                  value={
                    plannerKpis.blendedCpm != null
                      ? `₩${plannerKpis.blendedCpm.toLocaleString()}`
                      : "—"
                  }
                  footnote="1,000회 노출 단가"
                  variant="accent"
                />
                <StatCardFootnote
                  label="도달인 추정"
                  value={
                    plannerKpis.reach > 0
                      ? `${(plannerKpis.reach / 10000).toFixed(1)}만`
                      : "—"
                  }
                  footnote="총 노출 ÷ 빈도"
                />
                <StatCardFootnote
                  label="총 추정 노출"
                  value={
                    plannerKpis.totalImp > 0
                      ? `${(plannerKpis.totalImp / 10000).toLocaleString()}만`
                      : "—"
                  }
                  footnote="실측+추정 합산"
                />
                <StatCardFootnote
                  label="ROI 효율"
                  value={
                    plannerKpis.roiExpected != null
                      ? `${(plannerKpis.roiExpected / 10000).toFixed(0)}만`
                      : "—"
                  }
                  footnote="1억당 노출 환산"
                  variant="accent"
                />
              </StatGrid>
            </ReportSection>
          )}

          {data.mediaBookings && data.mediaBookings.length > 0 && (
            <ReportSection>
              <SectionTitle>집행 매체 상세</SectionTitle>
              <NeonTable
                headers={["매체명", "유형", "지역", "위치", "집행 기간", "일 유동", "가시성", "상태"]}
              >
                {data.mediaBookings.map((b, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-[var(--cr-row-even)]" : "bg-[var(--cr-row-odd)]"}>
                    <td className="max-w-[120px] px-3 py-2 font-semibold">{b.mediaName}</td>
                    <td className="px-3 py-2 text-[10px] text-[color:var(--cr-fg-table)]">{b.type ?? "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-[color:var(--cr-fg-table)]">{b.region ?? "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-[color:var(--cr-fg-table)]">{b.location}</td>
                    <td className="px-3 py-2 text-[10px] tabular-nums text-[color:var(--cr-fg-table)]">
                      {fmtDate(b.startsAt)} ~ {fmtDate(b.endsAt)}
                      <span className="ml-1 text-[color:var(--cr-fg-dim)]">({diffDays(b.startsAt, b.endsAt)}일)</span>
                    </td>
                    <td className="px-3 py-2 text-[10px] font-semibold tabular-nums">
                      {b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-[10px] tabular-nums">
                      {b.visibilityScore != null && b.visibilityScore > 0
                        ? `${b.visibilityScore} / 4`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <NeonBadge>{b.status}</NeonBadge>
                    </td>
                  </tr>
                ))}
              </NeonTable>
              <div className="mt-2">
                <SectionNote>
                  가시성은 매체 DB 점수(0~4) 기준. 유형·지역은 Media 메타이며, PDF 본문 표와 동일 맥락입니다.
                </SectionNote>
              </div>
            </ReportSection>
          )}

          {data.scheduleEvents && data.scheduleEvents.length > 0 && (
            <ReportSection>
              <SectionTitle>진행 일정</SectionTitle>
              <div className="flex flex-col gap-2">
                {data.scheduleEvents.map((e, i) => (
                  <div
                    key={i}
                    className="tkad-glass-surface-soft rounded-[18px] border border-[color:var(--cr-border-soft)] bg-[var(--cr-surface)] p-3.5 backdrop-blur-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--cr-accent)]" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[color:var(--cr-fg)]">{e.title}</span>
                          <NeonBadge>{scheduleKindKo(e.kind || "—")}</NeonBadge>
                        </div>
                        <p className="mt-1.5 text-[11px] tabular-nums text-[color:var(--cr-fg-subtle)]">
                          {fmtDate(e.startsAt)} — {fmtDate(e.endsAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {data.financialDocs && data.financialDocs.length > 0 && (
            <ReportSection>
              <SectionTitle>비용 내역</SectionTitle>
              <NeonTable headers={["구분", "항목", "금액", "상태"]}>
                {data.financialDocs.map((f, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-[var(--cr-row-even)]" : "bg-[var(--cr-row-odd)]"}>
                    <td className="px-3 py-2.5 text-[11px] text-[color:var(--cr-fg-subtle)]">
                      {formatFinancialDocKindKo(f.kind)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{f.title}</td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums">
                      {f.amountKrw ? fmtAmount(f.amountKrw) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-[color:var(--cr-fg-subtle)]">
                      {formatFinancialDocStatusKo(f.status)}
                    </td>
                  </tr>
                ))}
                {totalAmount > 0 ? (
                  <tr className="bg-[image:var(--cr-sum-row)]">
                    <td colSpan={2} className="px-3 py-3 font-display text-xs font-medium uppercase tracking-[0.16em] text-[#22d3ee]">
                      [ 합계 ]
                    </td>
                    <td className="px-3 py-3 text-base font-extrabold tabular-nums text-[#22d3ee]">
                      {fmtAmount(totalAmount)}
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                ) : null}
              </NeonTable>
            </ReportSection>
          )}

          {data.proofPhotos && data.proofPhotos.length > 0 && (
            <ReportSection>
              <SectionTitle>게재 증빙 사진</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.proofPhotos.slice(0, 9).map((p, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[14px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.caption ?? ""}
                      crossOrigin="anonymous"
                      className="block h-40 w-full object-cover"
                    />
                    {p.caption ? (
                      <p className="border-t border-[color:var(--cr-border-soft)] bg-[var(--cr-surface-soft)] px-3 py-2 text-[10px] text-[color:var(--cr-fg-body)]">
                        {`// `}
                        {p.caption}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {data.notes && (
            <ReportSection>
              <SectionTitle>특이사항</SectionTitle>
              <NotesBox>{data.notes}</NotesBox>
            </ReportSection>
          )}

          {/* (규칙) 평가/인사이트 자동 생성 섹션 제거 */}

          <ReportFooter />
      </ReportBody>
    </CampaignReportDocument>
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
    <ReportSection>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>노출 패턴 (시간대 · 요일 · 월별)</SectionTitle>
        {!agg.allReal ? <NeonBadge>[ 일부 추정 ]</NeonBadge> : null}
      </div>
      <SectionNote>
        매체 상세의 일유동 데이터(또는 매체유형·지역 기반 추정)를 가중평균한 캠페인 전체의 노출 패턴.
      </SectionNote>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
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
    </ReportSection>
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
    <ChartCard title={title} className="!rounded-[18px]">
      <div className="mb-2 flex justify-end">
        <NeonBadge>{peakLabel}</NeonBadge>
      </div>
      <div className="flex h-[60px] items-end gap-0.5">
        {values.map((v, i) => {
          const h = (v / max) * 100;
          const isPeak = i === peakIdx;
          return (
            <div key={i} className="relative flex-1" style={{ height: `${Math.max(2, h)}%` }}>
              <div
                className={cn(
                  "absolute inset-0 rounded-sm",
                  isPeak
                    ? "bg-[image:var(--cr-timeline-bar)]"
                    : "bg-[var(--cr-bar)]",
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex h-3 gap-0.5">
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[8px] font-medium text-[color:var(--cr-fg-dim)]"
          >
            {label}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
