"use client";

import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { BudgetSplitDonut } from "@/components/planner/budget-split-donut";
import { OnlineChannelCard } from "@/components/planner/brief/brief-online-channel-cards";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import type { AllocationPolicyResult } from "@/lib/integrated/allocation-policy";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import type { RecommendOnlineStatus } from "@/lib/recommend/build-mixed-recommend-result";
import {
  RECOMMEND_ONLINE_BUDGET_TOO_SMALL_EN,
  RECOMMEND_ONLINE_BUDGET_TOO_SMALL_KO,
  RECOMMEND_ONLINE_DIGITAL_BUDGET_ZERO_EN,
  RECOMMEND_ONLINE_DIGITAL_BUDGET_ZERO_KO,
  RECOMMEND_ONLINE_NO_CATALOG_EN,
  RECOMMEND_ONLINE_NO_CATALOG_KO,
  RECOMMEND_ONLINE_NO_RELEVANT_EN,
  RECOMMEND_ONLINE_NO_RELEVANT_KO,
} from "@/lib/recommend/copy-ko";

type Props = {
  online: OnlineCatalogRecommendResult | null;
  onlineStatus: RecommendOnlineStatus;
  allocation: AllocationPolicyResult;
  budgetMaxMan: number;
  isKo: boolean;
};

function crossChannelDonutData(
  allocation: AllocationPolicyResult,
  isKo: boolean,
): PlannerExportChartDatum[] {
  return [
    {
      label: "OOH",
      value: allocation.oohBudgetWon,
      colorKey: "ooh",
      pct: allocation.oohBudgetPct,
    },
    {
      label: isKo ? "온라인" : "Online",
      value: allocation.digitalBudgetWon,
      colorKey: "digital",
      pct: allocation.digitalBudgetPct,
    },
  ];
}

function statusMessage(
  onlineStatus: RecommendOnlineStatus,
  isKo: boolean,
): string {
  switch (onlineStatus) {
    case "no_relevant_channels":
      return isKo
        ? RECOMMEND_ONLINE_NO_RELEVANT_KO
        : RECOMMEND_ONLINE_NO_RELEVANT_EN;
    case "budget_too_small":
      return isKo
        ? RECOMMEND_ONLINE_BUDGET_TOO_SMALL_KO
        : RECOMMEND_ONLINE_BUDGET_TOO_SMALL_EN;
    case "digital_budget_zero":
      return isKo
        ? RECOMMEND_ONLINE_DIGITAL_BUDGET_ZERO_KO
        : RECOMMEND_ONLINE_DIGITAL_BUDGET_ZERO_EN;
    case "no_online_catalog":
      return isKo
        ? RECOMMEND_ONLINE_NO_CATALOG_KO
        : RECOMMEND_ONLINE_NO_CATALOG_EN;
    default:
      return "";
  }
}

export function RecommendOnlineMixSection({
  online,
  onlineStatus,
  allocation,
  budgetMaxMan,
  isKo,
}: Props) {
  const budgetLabel = isKo
    ? `총 월 예산 ${budgetMaxMan.toLocaleString("ko-KR")}만원 기준`
    : `Based on ${budgetMaxMan.toLocaleString("en-US")}M KRW/mo total`;

  if (onlineStatus !== "ok" || !online) {
    const message = statusMessage(onlineStatus, isKo);
    if (!message) return null;

    return (
      <section
        className="space-y-3 border-2 border-border bg-card p-5 sm:p-6"
        data-testid="recommend-online-mix-section"
        data-online-status={onlineStatus}
      >
        <div>
          <h3 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
            [ {isKo ? "온라인 채널" : "ONLINE CHANNELS"} ]
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{budgetLabel}</p>
        </div>
        <p className="rounded-lg border border-dashed border-border p-6 text-center tkad-type-body text-muted-foreground">
          {message}
        </p>
      </section>
    );
  }

  const donutData = crossChannelDonutData(allocation, isKo);

  return (
    <section
      className="space-y-4 border-2 border-border bg-card p-5 sm:p-6"
      data-testid="recommend-online-mix-section"
      data-online-status={onlineStatus}
    >
      <div>
        <h3 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
          [ {isKo ? "온라인 · OOH 예산 배분" : "ONLINE · OOH BUDGET SPLIT"} ]
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{budgetLabel}</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <h4 className="mb-3 tkad-type-title">
          {isKo ? "채널 간 예산 배분" : "Cross-channel split"}
        </h4>
        <BudgetSplitDonut data={donutData} />
      </div>

      <div>
        <h4 className="mb-2 tkad-type-title">
          {isKo ? "추천 온라인 채널" : "Recommended online channels"}
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {online.platforms.map((group) => (
            <div key={group.platform} className="flex min-w-0 flex-col gap-2">
              <OnlineChannelCard group={group} isKo={isKo} />
              <div
                className="flex justify-end px-0.5"
                data-testid={`recommend-online-cart-add-${group.topProduct.id}`}
              >
                <PlanCartAddButton
                  item={planCartItemFromMediaItem(
                    group.topProduct,
                    "ai_recommend",
                    {
                      lineTotalWonOverride: group.budgetMan * 10_000,
                    },
                  )}
                  addedFrom="ai_recommend"
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
