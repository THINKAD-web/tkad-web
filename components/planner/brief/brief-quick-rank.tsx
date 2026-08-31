"use client";

/**
 * O-2 빠른 추천 — scoreMediaCandidates() 랭킹 목록.
 *
 * 카드는 Step 2(믹스 편집)와 완전히 동일한 `BriefMediaCard` 를 쓴다 — 같은
 * 사용자가 같은 흐름에서 보는 화면이라 정보량이 갈릴 이유가 없다. 순위 배지만
 * 빠른 추천 고유 정보로 `rank` prop 을 통해 얹는다. 수량 조정도 여기서 바로
 * 가능하다(예전엔 Step 2 로 넘겨야 했다).
 */

import { useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  BRIEF_DEFAULT_DAYS,
  briefQuickRequiredStatus,
} from "@/lib/planner/brief/types";
import { filterBriefCatalogByRegion } from "@/lib/planner/brief/regions";
import {
  scoreMediaCandidates,
  briefRankingBasisLabel,
} from "@/lib/planner/brief/scoring";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";
import { BriefMediaCard } from "@/components/planner/brief/brief-media-card";
import { partitionScoredByBudget } from "@/lib/planner/brief/budget-ranking";
import { BudgetFilterBar } from "@/components/planner/brief/budget-filter-bar";
import { totalBudgetWon } from "@/lib/planner/brief/types";

const QUICK_DAYS = BRIEF_DEFAULT_DAYS;

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
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 tkad-type-caption text-muted-foreground">
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
          <BriefMediaCard
            key={s.media.id}
            scored={s}
            rank={i + 1}
            units={store.mixUnits[s.media.id] ?? 0}
            isKo={isKo}
            days={QUICK_DAYS}
            onAdd={() => store.addMediaToMix(s.media.id, 1)}
            onRemove={() => store.removeMediaFromMix(s.media.id)}
            onUnits={(n) => store.setMixUnits(s.media.id, n)}
            testIdPrefix="brief-quick-rank"
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
