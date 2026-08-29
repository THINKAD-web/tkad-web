"use client";

/**
 * O-2 빠른 추천 — scoreMediaCandidates() 랭킹 목록.
 *
 * 각 행에서 바로 믹스에 담을 수 있다. 수량 조정은 Step 2(믹스 편집)에서 한다 —
 * 빠른 추천은 "고르고 넘어가기"까지만 책임진다.
 */

import { useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  BRIEF_DEFAULT_DAYS,
  briefQuickRequiredStatus,
} from "@/lib/planner/brief/types";
import { filterBriefCatalogByRegion } from "@/lib/planner/brief/regions";
import {
  scoreMediaCandidates,
  briefRankingBasisLabel,
  type ScoredMedia,
} from "@/lib/planner/brief/scoring";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";
import { PlannerMediaThumb } from "@/components/planner/planner-media-thumb";
import { partitionScoredByBudget } from "@/lib/planner/brief/budget-ranking";
import { BudgetFilterBar } from "@/components/planner/brief/budget-filter-bar";
import { totalBudgetWon } from "@/lib/planner/brief/types";

const AXIS_LABEL: Record<string, { ko: string; en: string }> = {
  target: { ko: "타깃 적합", en: "Target fit" },
  budget: { ko: "예산 효율", en: "Budget efficiency" },
  region: { ko: "지역 적합", en: "Region fit" },
  industry: { ko: "업종 적합", en: "Industry fit" },
};

const QUICK_DAYS = BRIEF_DEFAULT_DAYS;

function RankRow({
  scored,
  rank,
  isKo,
  selected,
  onAdd,
  onRemove,
}: {
  scored: ScoredMedia;
  rank: number;
  isKo: boolean;
  selected: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { media, axes, total } = scored;
  const mediaName = isKo ? media.name : media.nameEn || media.name;

  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      data-testid="brief-quick-rank-row"
      data-selected={selected ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums">
          {rank}
        </span>
        <PlannerMediaThumb
          media={media}
          alt={mediaName}
          size="card"
          isKo={isKo}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{mediaName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {isKo ? media.location : media.locationEn || media.location}
              </p>
              {scored.overBudget ? (
                <p className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {isKo ? "예산 초과" : "Over budget"}
                </p>
              ) : null}
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

          <div className="mt-2.5">
            {selected ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={onRemove}
                data-testid="brief-quick-rank-remove"
              >
                {isKo ? "담김 · 제거" : "Added · Remove"}
              </Button>
            ) : (
              <Button
                type="button"
                size="xs"
                onClick={onAdd}
                data-testid="brief-quick-rank-add"
              >
                {isKo ? "믹스에 추가" : "Add to mix"}
              </Button>
            )}
          </div>
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

  const budgetWon = totalBudgetWon(store);
  const budgetPartition = useMemo(
    () =>
      partitionScoredByBudget({
        scored,
        budgetWithinOnly: store.budgetWithinOnly,
      }),
    [scored, store.budgetWithinOnly],
  );
  const visibleScored = budgetPartition.visible;

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

      {budgetWon > 0 ? (
        <BudgetFilterBar
          isKo={isKo}
          budgetWithinOnly={store.budgetWithinOnly}
          onToggle={store.setBudgetWithinOnly}
          hiddenOverBudgetCount={budgetPartition.hiddenOverBudgetCount}
          withinBudgetCount={budgetPartition.withinBudgetCount}
        />
      ) : null}

      <ul className="space-y-2">
        {visibleScored.slice(0, 20).map((s, i) => (
          <RankRow
            key={s.media.id}
            scored={s}
            rank={i + 1}
            isKo={isKo}
            selected={(store.mixUnits[s.media.id] ?? 0) > 0}
            onAdd={() => store.addMediaToMix(s.media.id, 1)}
            onRemove={() => store.removeMediaFromMix(s.media.id)}
          />
        ))}
      </ul>

      {visibleScored.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {isKo
            ? "조건에 맞는 매체가 없습니다. 지역을 넓혀 보세요."
            : "No media match. Try widening regions."}
        </p>
      ) : null}
    </div>
  );
}
