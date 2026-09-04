import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import { planCartLineMonthlyWon } from "@/lib/plan-cart-pricing";
import { defaultOnlineBudgetWon } from "@/components/media/online-media-budget-fields";
import { formatKpiRange } from "@/lib/digital/mix-engine";
import {
  estimatePerformance,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";
import {
  hasOnlinePricingSpec,
} from "@/lib/pricing-unavailable";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import type {
  PlannerExportKpi,
  PlannerExportMediaRow,
  PlannerExportOnlineLine,
  PlannerExportOnlineSection,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { buildOnlineCategoryRows } from "@/lib/planner-report-export/online-category-breakdown";
import { buildOnlineReportInsights } from "@/lib/planner-report-export/online-report-insights";
import { onlineConsultationLineNotice, onlineCatalogEstimationNotice } from "@/lib/planner-report-export/online-consultation-notice";
import { plannerReportPricingFootnote } from "@/lib/planner-report-export/pricing-footnote";
import {
  buildOnlineReportStrategyLines,
  buildOnlineReportWhyLine,
  type OnlineReportStrategyInput,
} from "@/lib/planner/report-strategy-online";
import {
  buildDefaultOnlineReportGreeting,
  buildOnlineExecutiveSummaryLines,
} from "@/lib/planner-report-export/report-copy-online";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";

export type BuildOnlineReportPayloadArgs = {
  isKo: boolean;
  goalTitle: string;
  budgetMan: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  industryKey?: PlannerIndustryKey | null;
  campaignGoal?: PlannerCampaignGoal | null;
  goalFollowUp?: PlannerGoalFollowUp;
  portfolio: MediaItem[];
  planCartItems?: PlanCartItem[];
  generatedAt: string;
  months?: number;
  clientName?: string;
  coverLogoUrl?: string | null;
  reportGreeting?: string;
  reportExecutiveSummaryLines?: string[];
};

function resolveOnlineBudgetWon(
  media: MediaItem,
  cartItem: PlanCartItem | undefined,
): number {
  const fromCart = cartItem?.lineTotalWon;
  if (fromCart != null && fromCart > 0) return fromCart;
  const monthly = planCartLineMonthlyWon(cartItem ?? { mediaId: media.id }, media);
  if (monthly != null && monthly > 0) return monthly;
  return defaultOnlineBudgetWon(media);
}

function buildOnlineLines(
  portfolio: MediaItem[],
  cartItems: PlanCartItem[] | undefined,
  isKo: boolean,
): PlannerExportOnlineLine[] {
  const cartById = new Map((cartItems ?? []).map((item) => [item.mediaId, item]));
  return portfolio.map((media) => {
    const cartItem = cartById.get(media.id);
    const calculable = hasOnlinePricingSpec(media);
    const budgetWon = resolveOnlineBudgetWon(media, cartItem);
    const est =
      calculable && media.onlineSpec
        ? estimatePerformance(media.onlineSpec, budgetWon)
        : null;
    const reachLabel =
      est?.reachMin != null && est?.reachMax != null
        ? formatKpiRange(est.reachMin, est.reachMax)
        : null;
    const clicksLabel =
      est?.clicksMin != null && est?.clicksMax != null
        ? formatKpiRange(est.clicksMin, est.clicksMax)
        : null;
    return {
      mediaId: media.id,
      slug: media.slug,
      name: isKo ? media.name : media.nameEn || media.name,
      platform: media.onlineSpec?.platform,
      budgetWon,
      pricingLabel:
        calculable && media.onlineSpec
          ? onlinePricingLabel(media.onlineSpec)
          : mediaPriceOnInquiryLabel(isKo ? "ko" : "en"),
      reachLabel,
      clicksLabel,
      hasEstimate: Boolean(reachLabel || clicksLabel),
    };
  });
}

function buildOnlineSectionKpis(
  section: Pick<
    PlannerExportOnlineSection,
    | "lines"
    | "totalBudgetWon"
    | "reachLabel"
    | "inquiryLineCount"
  >,
  isKo: boolean,
): PlannerExportKpi[] {
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  const lineCount = section.lines.length;
  const avgBudget =
    lineCount > 0 ? Math.round(section.totalBudgetWon / lineCount) : null;
  const inquiryHint =
    section.inquiryLineCount > 0
      ? onlineConsultationLineNotice(section.inquiryLineCount, isKo)
      : undefined;

  return [
    {
      label: isKo ? "선택 채널" : "Channels",
      value: String(lineCount),
      badge: "estimated",
    },
    {
      label: isKo ? "총 예산" : "Total budget",
      value: `₩${fmt(section.totalBudgetWon)}`,
      badge: "estimated",
    },
    {
      label: isKo ? "예상 도달" : "Est. reach",
      value: section.reachLabel ?? (isKo ? "별도 협의" : "Consultation"),
      badge: section.reachLabel ? "estimated" : "pending",
      pendingHint: !section.reachLabel ? inquiryHint ?? undefined : inquiryHint,
    },
    {
      label: isKo ? "평균 채널 예산" : "Avg. channel budget",
      value: avgBudget != null ? `₩${fmt(avgBudget)}` : "—",
      badge: "estimated",
    },
  ];
}

export function buildOnlineReportSection(
  args: BuildOnlineReportPayloadArgs,
): PlannerExportOnlineSection {
  const lines = buildOnlineLines(args.portfolio, args.planCartItems, args.isKo);
  const inquiryLineCount = lines.filter((l) => !l.hasEstimate).length;
  const calculableLineCount = lines.length - inquiryLineCount;
  const totalBudgetWon = lines.reduce((s, l) => s + l.budgetWon, 0);

  let reachMin = 0;
  let reachMax = 0;
  let clicksMin = 0;
  let clicksMax = 0;
  let hasReach = false;
  let hasClicks = false;

  for (const line of lines) {
    if (!line.hasEstimate) continue;
    const media = args.portfolio.find((m) => m.id === line.mediaId);
    if (!media?.onlineSpec) continue;
    const est = estimatePerformance(media.onlineSpec, line.budgetWon);
    if (!est) continue;
    if (est.reachMin != null && est.reachMax != null) {
      reachMin += est.reachMin;
      reachMax += est.reachMax;
      hasReach = true;
    }
    if (est.clicksMin != null && est.clicksMax != null) {
      clicksMin += est.clicksMin;
      clicksMax += est.clicksMax;
      hasClicks = true;
    }
  }

  const strategyInput: OnlineReportStrategyInput = {
    isKo: args.isKo,
    campaignGoal: args.campaignGoal ?? null,
    goalTitle: args.goalTitle,
    industryKey: args.industryKey ?? null,
    industryText: args.industryText,
    onlineLineCount: lines.length,
    calculableLineCount,
    inquiryLineCount,
  };

  const reachLabel = hasReach ? formatKpiRange(reachMin, reachMax) : null;
  const clicksLabel = hasClicks ? formatKpiRange(clicksMin, clicksMax) : null;

  const categoryRows = buildOnlineCategoryRows(
    args.portfolio,
    lines.map((l) => ({ mediaId: l.mediaId, budgetWon: l.budgetWon })),
    args.isKo,
  );

  const insights = buildOnlineReportInsights({
    isKo: args.isKo,
    portfolio: args.portfolio,
    ageText: args.ageText,
    regionsText: args.regionsText,
    channelCount: lines.length,
    budgetWon: totalBudgetWon,
    months: args.months,
  });

  const baseSection = {
    title: args.isKo ? "온라인 채널" : "Online channels",
    estimationNotice: onlineCatalogEstimationNotice(args.isKo),
    consultationNotice: onlineConsultationLineNotice(inquiryLineCount, args.isKo),
    inquiryLineCount,
    calculableLineCount,
    totalBudgetWon,
    lines,
    strategyLines: buildOnlineReportStrategyLines(strategyInput),
    whyLine: buildOnlineReportWhyLine(strategyInput),
    reachLabel,
    clicksLabel,
    categoryRows,
    insights,
  };

  return {
    ...baseSection,
    kpiCards: buildOnlineSectionKpis(baseSection, args.isKo),
  };
}

function onlineLineToExportRow(
  line: PlannerExportOnlineLine,
  isKo: boolean,
): PlannerExportMediaRow {
  const fmt = (n: number) =>
    n.toLocaleString(isKo ? "ko-KR" : "en-US");
  return {
    id: line.mediaId,
    name: line.name,
    type: line.platform,
    priceLabel: line.pricingLabel,
    monthlyPriceLabel: isKo ? `월 ₩${fmt(line.budgetWon)}` : `₩${fmt(line.budgetWon)}/mo`,
    lineTotalLabel: isKo ? `월 ₩${fmt(line.budgetWon)}` : `₩${fmt(line.budgetWon)}/mo`,
    metricsUnavailableLabel: line.hasEstimate
      ? undefined
      : isKo
        ? "별도 협의"
        : "Consultation",
    recommendReason: line.reachLabel
      ? isKo
        ? `예상 도달 ${line.reachLabel}`
        : `Est. reach ${line.reachLabel}`
      : undefined,
  };
}

export function buildOnlineReportPayload(
  args: BuildOnlineReportPayloadArgs,
): PlannerReportExportPayload {
  const isKo = args.isKo;
  const onlineSection = buildOnlineReportSection(args);
  const strategyInput: OnlineReportStrategyInput = {
    isKo: args.isKo,
    campaignGoal: args.campaignGoal ?? null,
    goalTitle: args.goalTitle,
    industryKey: args.industryKey ?? null,
    industryText: args.industryText,
    onlineLineCount: onlineSection.lines.length,
    calculableLineCount: onlineSection.calculableLineCount,
    inquiryLineCount: onlineSection.inquiryLineCount,
  };
  const defaultExecutiveLines = buildOnlineExecutiveSummaryLines(strategyInput);
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

  const kpis: PlannerExportKpi[] = [
    {
      label: isKo ? "온라인 월 예산" : "Online monthly budget",
      value: `₩${fmt(onlineSection.totalBudgetWon)}`,
      badge: "estimated",
    },
    {
      label: isKo ? "예상 도달" : "Est. reach",
      value: onlineSection.reachLabel ?? (isKo ? "별도 협의" : "Consultation"),
      badge: onlineSection.reachLabel ? "estimated" : "pending",
    },
    {
      label: isKo ? "예상 클릭" : "Est. clicks",
      value: onlineSection.clicksLabel ?? (isKo ? "별도 협의" : "Consultation"),
      badge: onlineSection.clicksLabel ? "estimated" : "pending",
    },
  ];

  const portfolio = onlineSection.lines.map((line) =>
    onlineLineToExportRow(line, isKo),
  );

  return {
    kind: "ooh",
    reportComposition: "onlyOnline",
    isKo,
    documentTitle: isKo ? "온라인 매체 제안 보고서" : "Online media proposal",
    campaignName: args.goalTitle,
    clientName: args.clientName?.trim() || undefined,
    coverLogoUrl: args.coverLogoUrl?.trim() || undefined,
    greetingText: buildDefaultOnlineReportGreeting(isKo, args.clientName),
    executiveSummaryLines: defaultExecutiveLines,
    generatedAt: args.generatedAt,
    goalTitle: args.goalTitle,
    budgetMan: args.budgetMan,
    periodDisplay: args.periodDisplay,
    regionsText: args.regionsText,
    categoriesText: args.categoriesText,
    ageText: args.ageText,
    industryText: args.industryText,
    kpis,
    portfolio,
    onlineSection,
    sections: [],
    pricingFootnote: plannerReportPricingFootnote(isKo),
    disclaimer: isKo
      ? "본 보고서의 온라인 예상 성과는 카탈로그 CPC·CPM 참고 범위 기반이며, 실제 집행·과금 조건에 따라 달라질 수 있습니다."
      : "Online estimates use catalog CPC/CPM reference ranges; actual delivery and billing may vary.",
  };
}
