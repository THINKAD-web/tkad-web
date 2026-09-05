"use client";

/**
 * O-1 / PART3-5 — digital_only 결과 화면 KPI 그리드.
 * 퍼널(인지/고려/전환)은 뒷받침할 데이터가 없어 만들지 않는다 — 대신
 * 실제 산출 가능한 지표(예산·채널 수·노출/클릭 범위)만 보여준다.
 */

import type { OnlineResultKpis } from "@/lib/planner/brief/online-result-kpis";

function KpiTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="tkad-type-caption text-muted-foreground">{label}</p>
      <p className="mt-1 tkad-type-title tabular-nums">{value}</p>
      {note ? <p className="mt-0.5 tkad-type-note text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function OnlineKpiGrid({
  kpis,
  isKo,
}: {
  kpis: OnlineResultKpis;
  isKo: boolean;
}) {
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  const range = (min: number, max: number) =>
    min === max ? fmt(min) : `${fmt(min)} ~ ${fmt(max)}`;

  const tiles: { label: string; value: string; note?: string }[] = [
    {
      label: isKo ? "추천 채널" : "Recommended channels",
      value: `${kpis.channelCount}${isKo ? "개" : ""}`,
    },
    {
      label: isKo ? "배분 예산" : "Allocated budget",
      value: `${fmt(kpis.totalBudgetMan)}${isKo ? "만원" : "M KRW"}`,
    },
  ];

  if (kpis.impressions) {
    tiles.push({
      label: isKo ? "예상 노출 (합계)" : "Est. impressions (total)",
      value: range(kpis.impressions.min, kpis.impressions.max),
      note:
        kpis.impressions.channelsWithRateCount < kpis.impressions.channelCount
          ? isKo
            ? `단가 정보 있는 ${kpis.impressions.channelsWithRateCount}/${kpis.impressions.channelCount}개 채널 기준`
            : `Based on ${kpis.impressions.channelsWithRateCount}/${kpis.impressions.channelCount} channels with rate data`
          : undefined,
    });
  }

  if (kpis.clicks) {
    tiles.push({
      label: isKo ? "예상 클릭 (합계)" : "Est. clicks (total)",
      value: range(kpis.clicks.min, kpis.clicks.max),
      note:
        kpis.clicks.channelsWithRateCount < kpis.clicks.channelCount
          ? isKo
            ? `단가 정보 있는 ${kpis.clicks.channelsWithRateCount}/${kpis.clicks.channelCount}개 채널 기준`
            : `Based on ${kpis.clicks.channelsWithRateCount}/${kpis.clicks.channelCount} channels with rate data`
          : undefined,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="brief-online-kpi-grid">
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </div>
  );
}
