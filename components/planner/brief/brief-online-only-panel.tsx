"use client";

/**
 * O-1 / PART3-5 + PR3 — `channelMode === "digital_only"` Step 2 패널.
 * baseline 추천을 시드로 mix 편집(selectedMediaIds) 후 reallocateOnlineBudget()로
 * 예산을 서버·클라이언트 모두 재계산한다.
 */

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  baselineOnlineCatalogFromBrief,
  recommendOnlineCatalogFromBrief,
} from "@/lib/planner/brief/online-catalog-adapter";
import {
  OnlineMixChannelCard,
  OnlineExcludedForBudgetSection,
} from "@/components/planner/brief/brief-online-channel-cards";
import { OnlineBudgetDonut } from "@/components/planner/brief/brief-online-budget-donut";
import { OnlineKpiGrid } from "@/components/planner/brief/brief-online-kpi-grid";
import { summarizeOnlineResultKpis } from "@/lib/planner/brief/online-result-kpis";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";
import { useToast } from "@/components/toast-provider";

export type OnlineCatalogHookResult = {
  result: OnlineCatalogRecommendResult;
  baseline: OnlineCatalogRecommendResult;
  removedPool: OnlineCatalogRecommendResult["platforms"];
};

export function useOnlineCatalogResult(
  catalog: readonly MediaItem[],
  isKo: boolean,
): OnlineCatalogHookResult {
  const store = useBriefStore();
  const briefSlice = useBriefStore(
    useShallow((s) => ({
      goal: s.goal,
      industry: s.industry,
      ageBands: s.ageBands,
      genders: s.genders,
      budgetInputWon: s.budgetInputWon,
      budgetMode: s.budgetMode,
      regionCodes: s.regionCodes,
      flightStart: s.flightStart,
      flightEnd: s.flightEnd,
      freeText: s.freeText,
      onlineMix: s.onlineMix,
    })),
  );
  const seedOnlineMixFromRecommend = useBriefStore(
    (s) => s.seedOnlineMixFromRecommend,
  );
  const onlineMix = briefSlice.onlineMix;
  const briefInput = useMemo(() => {
    const { onlineMix: _mix, ...brief } = briefSlice;
    return brief;
  }, [briefSlice]);

  const briefKey = useMemo(
    () =>
      [
        briefInput.goal,
        briefInput.industry,
        briefInput.ageBands.join(","),
        briefInput.genders.join(","),
        briefInput.budgetInputWon,
        briefInput.budgetMode,
      ].join("|"),
    [briefInput],
  );

  const baseline = useMemo(
    () => baselineOnlineCatalogFromBrief(briefInput, catalog, isKo),
    [briefInput, catalog, isKo, briefKey],
  );

  useEffect(() => {
    if (baseline.platforms.length === 0) return;
    if (onlineMix.selectedMediaIds.length > 0) return;
    const excluded = new Set(onlineMix.excludedMediaIds);
    const ids = baseline.platforms
      .map((p) => p.topProduct.id)
      .filter((id) => !excluded.has(id));
    if (ids.length > 0) {
      seedOnlineMixFromRecommend(ids);
    }
  }, [
    baseline.platforms,
    onlineMix.selectedMediaIds.length,
    onlineMix.excludedMediaIds,
    seedOnlineMixFromRecommend,
  ]);

  const result = useMemo(
    () => recommendOnlineCatalogFromBrief(briefInput, catalog, isKo, onlineMix),
    [briefInput, catalog, isKo, onlineMix, briefKey],
  );

  const removedPool = useMemo(() => {
    const selected = new Set(onlineMix.selectedMediaIds);
    const excluded = new Set(onlineMix.excludedMediaIds);
    return baseline.platforms.filter(
      (p) =>
        !selected.has(p.topProduct.id) && excluded.has(p.topProduct.id),
    );
  }, [baseline.platforms, onlineMix.selectedMediaIds, onlineMix.excludedMediaIds]);

  return { result, baseline, removedPool };
}

export function BriefOnlineOnlyPanel({
  isKo,
  hookResult,
  editable = false,
}: {
  catalog: readonly MediaItem[];
  isKo: boolean;
  hookResult: OnlineCatalogHookResult;
  editable?: boolean;
}) {
  const store = useBriefStore();
  const { toast } = useToast();
  const { result, baseline, removedPool } = hookResult;
  const kpis = summarizeOnlineResultKpis(result);
  const hasSelected = result.platforms.length > 0;

  const handleForceAdd = (mediaId: string) => {
    store.addOnlineChannel(mediaId);
    const entry = baseline.excludedForBudget.find(
      (e) => e.topProductMediaId === mediaId,
    );
    if (entry) {
      toast(
        "warning",
        isKo
          ? `${entry.platform} — 최소 집행금액(${entry.minBudgetMan}만원) 미달 가능성이 있습니다. 결과에서 다시 제외될 수 있습니다.`
          : `${entry.platform} — may fall below the minimum budget (${entry.minBudgetMan}M KRW) and be dropped again.`,
      );
    }
  };

  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
      data-testid="brief-online-only-panel"
    >
      <div>
        <h3 className="tkad-type-title">
          {editable
            ? isKo
              ? "온라인 채널 mix"
              : "Online channel mix"
            : isKo
              ? "온라인 채널 추천"
              : "Online channel recommendations"}
        </h3>
        <p className="mt-1 tkad-type-caption text-muted-foreground">
          {editable
            ? isKo
              ? `총 ${result.totalBudgetMan.toLocaleString("ko-KR")}만원을 선택한 채널에 재배분합니다. 비율은 서버가 다시 계산합니다.`
              : `Your ${result.totalBudgetMan.toLocaleString("en-US")}M KRW budget is reallocated across selected channels (percentages are recalculated).`
            : isKo
              ? `총 예산 ${result.totalBudgetMan.toLocaleString("ko-KR")}만원을 전액 온라인 채널에 배분합니다.`
              : `Your full budget (${result.totalBudgetMan.toLocaleString("en-US")}M KRW) is allocated to online channels.`}
        </p>
      </div>

      {result.noRelevantChannels ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {isKo
            ? "지정한 목표·업종·타깃 조건에 맞는 온라인 채널이 없습니다. Step 1에서 조건을 넓혀 보세요."
            : "No online channels match the goal/industry/target you set. Try widening them in Step 1."}
        </p>
      ) : result.budgetTooSmall && !hasSelected ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {isKo
            ? "관련 채널은 있지만 현재 예산·선택 조합으로는 어떤 채널의 최소 집행금액도 채울 수 없습니다. 예산을 늘리거나 채널을 줄여 보세요."
            : "Relevant channels exist, but the budget can't cover any channel's minimum spend with the current selection. Try a larger budget or fewer channels."}
        </p>
      ) : !hasSelected ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {isKo
            ? "채널을 하나 이상 선택해 주세요."
            : "Select at least one channel."}
        </p>
      ) : (
        <>
          {editable ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <h4 className="mb-2 tkad-type-caption font-medium text-muted-foreground">
                {isKo ? "선택된 채널" : "Selected channels"}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {result.platforms.map((group) => (
                  <OnlineMixChannelCard
                    key={group.platform}
                    group={group}
                    isKo={isKo}
                    variant="selected"
                    onRemove={() => store.removeOnlineChannel(group.topProduct.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.platforms.map((group) => (
                <OnlineMixChannelCard
                  key={group.platform}
                  group={group}
                  isKo={isKo}
                  variant="selected"
                />
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="mb-2 tkad-type-title">
              {isKo ? "예산 배분" : "Budget allocation"}
            </h4>
            <OnlineBudgetDonut platforms={result.platforms} isKo={isKo} />
          </div>

          <OnlineKpiGrid kpis={kpis} isKo={isKo} />
        </>
      )}

      {editable && removedPool.length > 0 ? (
        <div className="space-y-2">
          <h4 className="tkad-type-caption font-medium text-muted-foreground">
            {isKo ? "제거한 채널 — 다시 추가" : "Removed channels — add back"}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {removedPool.map((group) => (
              <OnlineMixChannelCard
                key={group.platform}
                group={group}
                isKo={isKo}
                variant="pool"
                onAdd={() => store.addOnlineChannel(group.topProduct.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <OnlineExcludedForBudgetSection
        entries={baseline.excludedForBudget}
        isKo={isKo}
        onForceAdd={editable ? handleForceAdd : undefined}
      />
    </section>
  );
}
