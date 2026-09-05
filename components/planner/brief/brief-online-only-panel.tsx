"use client";

/**
 * O-1 / PART3-5 — `channelMode === "digital_only"` Step 2 패널.
 * OOH 매체 믹스 빌더 대신 자체 온라인 카탈로그 스코어러
 * (`recommendOnlineCatalogChannels`) 결과를 그대로 보여준다 — 수동 채널
 * 선택 토글 없음(점수·예산 배분 기반 추천이라 dmpilot BriefDigitalPanel의
 * 체크박스 UX와는 다르다).
 */

import { useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore } from "@/lib/planner/brief/store";
import { recommendOnlineCatalogFromBrief } from "@/lib/planner/brief/online-catalog-adapter";
import {
  OnlineChannelCard,
  OnlineExcludedForBudgetSection,
} from "@/components/planner/brief/brief-online-channel-cards";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";

export function useOnlineCatalogResult(
  catalog: readonly MediaItem[],
  isKo: boolean,
): OnlineCatalogRecommendResult {
  const store = useBriefStore();
  return useMemo(
    () => recommendOnlineCatalogFromBrief(store, catalog, isKo),
    [
      store.goal,
      store.industry,
      store.ageBands,
      store.genders,
      store.budgetInputWon,
      store.budgetMode,
      catalog,
      isKo,
    ],
  );
}

export function BriefOnlineOnlyPanel({
  catalog,
  isKo,
  result,
}: {
  catalog: readonly MediaItem[];
  isKo: boolean;
  result: OnlineCatalogRecommendResult;
}) {
  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
      data-testid="brief-online-only-panel"
    >
      <div>
        <h3 className="tkad-type-title">
          {isKo ? "온라인 채널 추천" : "Online channel recommendations"}
        </h3>
        <p className="mt-1 tkad-type-caption text-muted-foreground">
          {isKo
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
      ) : result.budgetTooSmall ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {isKo
            ? "관련 채널은 있지만 현재 예산으로는 어떤 채널의 최소 집행금액도 채울 수 없습니다. 예산을 늘려 보세요."
            : "Relevant channels exist, but the budget can't cover any channel's minimum spend. Try a larger budget."}
        </p>
      ) : result.platforms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {isKo
            ? "예산을 입력하면 추천 채널을 계산합니다."
            : "Enter a budget to calculate recommended channels."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.platforms.map((group) => (
              <OnlineChannelCard key={group.platform} group={group} isKo={isKo} />
            ))}
          </div>
          <OnlineExcludedForBudgetSection
            entries={result.excludedForBudget}
            isKo={isKo}
          />
        </>
      )}
    </section>
  );
}
