"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Sparkles, Timer, Layers } from "lucide-react";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import { ReportAccessGate } from "@/components/report-access-gate";
import type { CompetitiveDashboardData } from "@/lib/insights/competitive-dashboard-data";
import { industryLabel } from "@/lib/insights/industry-classify";
import { Link } from "@/i18n/navigation";

type Props = {
  isKo: boolean;
  access: AccessCheckResult;
  teaser: CompetitiveDashboardData;
};

export function CompetitiveDashboardClient({ isKo, access, teaser }: Props) {
  const [data, setData] = useState<CompetitiveDashboardData | null>(
    access.allowed ? null : teaser,
  );
  const [industry, setIndustry] = useState(teaser.selectedIndustry);
  const [loading, setLoading] = useState(access.allowed);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!access.allowed) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/insights/competitive?locale=${isKo ? "ko" : "en"}&industry=${encodeURIComponent(industry)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json.error?.message ?? "load_failed");
        return;
      }
      setData(json.data as CompetitiveDashboardData);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "network");
    } finally {
      setLoading(false);
    }
  }, [access.allowed, isKo, industry]);

  useEffect(() => {
    void load();
  }, [load]);

  const display = data ?? teaser;
  const monthTitle = isKo
    ? `이번 달 ${industryLabel(display.selectedIndustry, true)} 업계 OOH 집행 현황`
    : `This month · ${industryLabel(display.selectedIndustry, false)} OOH activity`;

  const dashboard = (
    <div className="space-y-8">
      {access.allowed ? (
        <div className="flex flex-wrap gap-2">
          {display.industries.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndustry(ind)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${ industry === ind ? "border-hermes bg-hermes/15 text-hermes" : "border-border bg-card hover:border-hermes/30" }`}
            >
              {industryLabel(ind, isKo)}
            </button>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <h2 className="text-lg font-black">{monthTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isKo ? display.snapshot.periodLabelKo : display.snapshot.periodLabelEn}
          {" · "}
          {isKo
            ? `집행 ${display.snapshot.totalCampaigns}건 (자체 DB)`
            : `${display.snapshot.totalCampaigns} flights (internal DB)`}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-hermes" />
              {isKo ? "지역 집중도" : "Region focus"}
            </h3>
            <ul className="space-y-2">
              {display.snapshot.topRegions.map((r) => (
                <li key={r.region}>
                  <div className="flex justify-between text-sm">
                    <span>{r.region}</span>
                    <span className="font-bold tabular-nums">{r.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-hermes"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Layers className="h-4 w-4 text-muted-foreground" />
              {isKo ? "선호 매체 유형" : "Preferred media types"}
            </h3>
            <ul className="space-y-2">
              {display.snapshot.mediaTypePrefs.map((t) => (
                <li
                  key={t.type}
                  className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2 text-sm"
                >
                  <span>{t.label}</span>
                  <span className="font-bold tabular-nums">{t.pct}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-hermes/20 bg-hermes/5 p-5">
            <Timer className="h-6 w-6 text-hermes" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isKo ? "평균 집행 기간" : "Avg flight duration"}
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {display.snapshot.avgDurationDays}
              <span className="ml-1 text-base font-semibold text-muted-foreground">
                {isKo ? "일" : " days"}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <h2 className="text-lg font-black">
          {isKo ? "시즌별 업종 집행 트렌드" : "Seasonal industry heatmap"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isKo
            ? "이 시즌에 OOH 많이 쓰는 업종 — 월별 업종 집중도"
            : "Industries using OOH most this season — monthly concentration"}
        </p>

        {display.currentSeasonTop.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {display.currentSeasonTop.map((row) => (
              <span
                key={row.industry}
                className="rounded-full border border-hermes/30 bg-hermes/10 px-3 py-1 text-xs font-bold text-hermes"
              >
                {row.label} · {row.score}
              </span>
            ))}
          </div>
        ) : null}

        <HeatmapGrid data={display} isKo={isKo} />
      </section>

      <p className="text-center text-xs text-muted-foreground">
        {isKo ? display.confidenceNoteKo : display.confidenceNoteEn}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
          [ PRO · COMPETITIVE INTEL ]
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {isKo ? "OOH 경쟁 분석" : "OOH competitive analysis"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isKo
            ? "업종·지역·매체 유형별 집행 현황과 시즌 트렌드를 자체 DB로 분석합니다."
            : "Industry, region, and media-type flight intel from our internal DB."}
        </p>
        {!access.allowed ? (
          <Link
            href="/pricing?trial=1"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            {isKo ? "PRO 14일 무료 체험" : "Start 14-day PRO trial"}
          </Link>
        ) : null}
      </header>

      {loading && access.allowed ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : err ? (
        <p className="text-sm text-destructive">{err}</p>
      ) : (
        <ReportAccessGate access={access} feature="competitor" isKo={isKo}>
          {dashboard}
        </ReportAccessGate>
      )}

      {!access.allowed ? (
        <div className="pointer-events-none select-none blur-sm">{dashboard}</div>
      ) : null}
    </div>
  );
}

function HeatmapGrid({
  data,
  isKo,
}: {
  data: CompetitiveDashboardData;
  isKo: boolean;
}) {
  const months = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of data.seasonalHeatmap) {
      if (!seen.has(c.monthLabel)) {
        seen.add(c.monthLabel);
        out.push(c.monthLabel);
      }
    }
    return out.slice(-12);
  }, [data.seasonalHeatmap]);

  const cellMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.seasonalHeatmap) {
      m.set(`${c.industry}|${c.monthLabel}`, c.intensity);
    }
    return m;
  }, [data.seasonalHeatmap]);

  return (
    <div className="mt-6 overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `8rem repeat(${months.length}, minmax(2.5rem, 1fr))`,
        }}
      >
        <div />
        {months.map((ml) => (
          <div
            key={ml}
            className="text-center text-[10px] font-semibold text-muted-foreground"
          >
            {ml}
          </div>
        ))}
        {data.heatmapIndustries.map((ind) => (
          <div key={ind} className="contents">
            <div className="flex items-center text-xs font-semibold">
              {industryLabel(ind, isKo)}
            </div>
            {months.map((ml) => {
              const intensity = cellMap.get(`${ind}|${ml}`) ?? 0;
              const alpha = 0.08 + intensity * 0.85;
              return (
                <div
                  key={`${ind}-${ml}`}
                  className="h-8 rounded-md border border-border/30"
                  style={{
                    backgroundColor: `rgba(255, 98, 0, ${alpha})`,
                  }}
                  title={`${ind} ${ml}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
