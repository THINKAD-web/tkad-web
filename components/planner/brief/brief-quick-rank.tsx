"use client";

/**
 * O-2 빠른 추천 — scoreMediaCandidates() 랭킹 목록 (믹스 편집 없음).
 */

import { useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore } from "@/lib/planner/brief/store";
import { briefQuickRequiredStatus } from "@/lib/planner/brief/types";
import { filterBriefCatalogByRegion } from "@/lib/planner/brief/regions";
import {
  scoreMediaCandidates,
  briefRankingBasisLabel,
  type ScoredMedia,
} from "@/lib/planner/brief/scoring";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";

const AXIS_LABEL: Record<string, { ko: string; en: string }> = {
  target: { ko: "타깃 적합", en: "Target fit" },
  budget: { ko: "예산 효율", en: "Budget efficiency" },
  region: { ko: "지역 적합", en: "Region fit" },
  industry: { ko: "업종 적합", en: "Industry fit" },
};

const QUICK_DAYS = 30;

function RankRow({ scored, rank, isKo }: { scored: ScoredMedia; rank: number; isKo: boolean }) {
  const { media, axes, total } = scored;

  return (
    <li
      className="rounded-xl border border-border bg-card p-3"
      data-testid="brief-quick-rank-row"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {isKo ? media.name : media.nameEn || media.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isKo ? media.location : media.locationEn || media.location}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold tabular-nums">
              {total}
            </span>
          </div>
          {axes.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {axes.map((a) => (
                <li key={a.key} className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {AXIS_LABEL[a.key]?.[isKo ? "ko" : "en"] ?? a.key} {a.score}
                  </span>
                  {" ← "}
                  {a.rationale}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function BriefQuickRankPanel({
  catalog,
  isKo,
}: {
  catalog: readonly MediaItem[];
  isKo: boolean;
}) {
  const store = useBriefStore();
  const ready = briefQuickRequiredStatus(store);

  const candidates = useMemo(
    () => filterBriefCatalogByRegion(catalog, store.regionCodes),
    [catalog, store.regionCodes],
  );

  const scored = useMemo(
    () =>
      ready.ok
        ? scoreMediaCandidates({
            candidates,
            brief: store,
            days: QUICK_DAYS,
            isKo,
          })
        : [],
    [candidates, store, ready.ok, isKo],
  );

  if (!ready.ok) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {isKo
          ? "예산을 입력하면 매체 순위가 표시됩니다."
          : "Enter a budget to see media rankings."}
      </p>
    );
  }

  return (
    <div data-testid="brief-quick-rank-panel">
      {store.genders.length > 0 || store.ageBands.length > 0 ? (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          <span>
            {isKo
              ? "성별·연령은 매체 유형·등록 정보 기반 추정치입니다."
              : "Gender and age use type-based or registered-text estimates."}
          </span>
          <DataQualityBadge basis="default" isKo={isKo} />
        </p>
      ) : null}

      <p className="mb-2 text-xs text-muted-foreground">
        {briefRankingBasisLabel(store, QUICK_DAYS, isKo)}
      </p>

      <ul className="space-y-2">
        {scored.slice(0, 20).map((s, i) => (
          <RankRow key={s.media.id} scored={s} rank={i + 1} isKo={isKo} />
        ))}
      </ul>

      {scored.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {isKo
            ? "조건에 맞는 매체가 없습니다. 지역을 넓혀 보세요."
            : "No media match. Try widening regions."}
        </p>
      ) : null}
    </div>
  );
}
