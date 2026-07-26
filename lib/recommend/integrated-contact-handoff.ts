import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput, Industry } from "@/lib/ai-media-recommend";
import type { ContactIndustry } from "@/lib/contact-lead-schema";
import type { MediaAiRecommendFormSubmit } from "@/components/media-ai-recommend-form";
import type { PlanTransferData } from "@/lib/planner-contact-transfer";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import {
  plannerMediaPeriodTotalWon,
  plannerMonthlyPriceWonForMedia,
  resolveQuoteCampaignPeriodFromWeeks,
} from "@/lib/planner/planner-media-quantity";
import type { PlanCartItem } from "@/lib/plan-cart";
import { planCartLinePeriodTotalWon } from "@/lib/plan-cart-pricing";
import {
  estimateCatalogCpmWon,
  resolveMonthlyImpressions,
} from "@/lib/media-price-format";

const RECOMMEND_INDUSTRY_TO_CONTACT: Partial<Record<Industry, ContactIndustry>> = {
  beauty: "beauty_fashion",
  retail: "beauty_fashion",
  fmcg: "fnb",
  fintech: "finance",
  auto: "it_tech",
  entertainment: "entertainment",
  other: "other",
};

export function recommendIndustryToContactIndustry(
  industry: Industry | undefined,
): ContactIndustry | undefined {
  if (!industry) return undefined;
  return RECOMMEND_INDUSTRY_TO_CONTACT[industry] ?? "other";
}

export function buildIntegratedRecommendPlanTransfer(opts: {
  payload: MediaAiRecommendFormSubmit;
  picked: MediaItem[];
  isKo: boolean;
  planCartItems: PlanCartItem[];
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
}): PlanTransferData {
  const { payload, picked, isKo } = opts;
  const input = payload.input;
  const periodWeeks = input.preferredPeriodWeeks ?? 4;
  const duration = Math.max(1, Math.round(periodWeeks / 4));
  const periodCtx = { weeks: periodWeeks };

  let totalBudget = 0;
  if (picked.length > 0) {
    totalBudget = picked.reduce((sum, media) => {
      const cartItem = opts.planCartItems.find((i) => i.mediaId === media.id);
      if (cartItem) {
        return sum + planCartLinePeriodTotalWon(cartItem, media, periodCtx, isKo);
      }
      const campaignPeriod = resolveQuoteCampaignPeriodFromWeeks(periodWeeks);
      if (campaignPeriod) {
        return (
          sum +
          plannerMediaPeriodTotalWon(media, {
            campaignPeriod,
            quantities: opts.quantities,
            priceOptionIndex: opts.priceOptionIndex,
            isKo,
          })
        );
      }
      return (
        sum +
        plannerMonthlyPriceWonForMedia(
          media,
          opts.quantities,
          opts.priceOptionIndex,
        ) *
          duration
      );
    }, 0);
  } else if (input.budgetMaxMan > 0) {
    totalBudget = input.budgetMaxMan * 10_000 * duration;
  }

  const estimatedReach =
    picked.length > 0
      ? picked.reduce((sum, media) => sum + resolveMonthlyImpressions(media), 0) *
        duration
      : undefined;
  const cpmValues = picked
    .map((media) => estimateCatalogCpmWon(media))
    .filter((value): value is number => value != null && Number.isFinite(value));
  const estimatedCpm =
    cpmValues.length > 0
      ? cpmValues.reduce((a, b) => a + b, 0) / cpmValues.length
      : undefined;

  return {
    mediaIds: picked.map((media) => media.id),
    mediaNames: picked.map((media) => (isKo ? media.name : media.nameEn || media.name)),
    totalBudget,
    duration,
    region: payload.regionCodes.join(", ") || input.region || undefined,
    goal: input.goal,
    estimatedReach,
    estimatedCpm,
    source: "integrated",
    recommendIndustry: input.industry,
    budgetMaxMan: input.budgetMaxMan > 0 ? input.budgetMaxMan : undefined,
  };
}

export function integratedRecommendSummaryLines(
  input: AiRecommendInput,
  isKo: boolean,
): string[] {
  const budgetLine =
    input.budgetMaxMan > 0
      ? isKo
        ? `- 월 예산 상한: ${input.budgetMaxMan.toLocaleString("ko-KR")}만원`
        : `- Monthly budget cap: ₩${(input.budgetMaxMan * 10_000).toLocaleString("en-US")}`
      : null;
  return [
    isKo ? "[추천 조건 요약]" : "[Recommend criteria]",
    isKo ? `- 캠페인 목표: ${input.goal}` : `- Campaign goal: ${input.goal}`,
    isKo ? `- 업종: ${input.industry}` : `- Industry: ${input.industry}`,
    budgetLine,
    input.region
      ? isKo
        ? `- 지역: ${input.region}`
        : `- Region: ${input.region}`
      : null,
    input.preferredPeriodWeeks
      ? isKo
        ? `- 희망 기간: ${input.preferredPeriodWeeks}주`
        : `- Preferred period: ${input.preferredPeriodWeeks} weeks`
      : null,
  ].filter((line): line is string => Boolean(line));
}
