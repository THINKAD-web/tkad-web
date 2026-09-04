import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import { splitPortfolioByCatalogChannel } from "@/lib/plan-cart-report/split-portfolio-by-channel";
import {
  buildOohReportPayload,
  type BuildOohPayloadArgs,
} from "@/lib/planner-report-export/payload-ooh";
import {
  buildOnlineReportPayload,
  buildOnlineReportSection,
  type BuildOnlineReportPayloadArgs,
} from "@/lib/planner-report-export/payload-online";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

export type BuildReportPayloadArgs = BuildOohPayloadArgs;

function toOnlineArgs(args: BuildReportPayloadArgs): BuildOnlineReportPayloadArgs {
  return {
    isKo: args.isKo,
    goalTitle: args.goalTitle,
    budgetMan: args.budgetMan,
    periodDisplay: args.periodDisplay,
    regionsText: args.regionsText,
    categoriesText: args.categoriesText,
    ageText: args.ageText,
    industryText: args.industryText,
    industryKey: args.industryKey,
    campaignGoal: args.campaignGoal,
    goalFollowUp: args.goalFollowUp,
    portfolio: args.portfolio,
    planCartItems: args.planCartItems,
    generatedAt: args.generatedAt,
    months: args.months,
    clientName: args.clientName,
    coverLogoUrl: args.coverLogoUrl,
    reportGreeting: args.reportGreeting,
    reportExecutiveSummaryLines: args.reportExecutiveSummaryLines,
  };
}

function buildMixedReportPayload(
  args: BuildReportPayloadArgs,
  split: ReturnType<typeof splitPortfolioByCatalogChannel>,
): PlannerReportExportPayload {
  const isKo = args.isKo;
  const oohPayload = buildOohReportPayload({
    ...args,
    portfolio: split.oohPortfolio,
    planCartItems: split.oohCartItems,
  });

  const onlineSection = buildOnlineReportSection({
    ...toOnlineArgs(args),
    portfolio: split.onlinePortfolio,
    planCartItems: split.onlineCartItems,
  });

  const mixedNotice = isKo
    ? "OOH 매체는 아래 집행 기간 기준, 온라인 매체는 라인별 월 예산으로 견적됩니다."
    : "OOH lines use the campaign flight period; online lines use per-channel monthly budgets.";

  return {
    ...oohPayload,
    reportComposition: "mixed",
    onlineSection,
    documentTitle: isKo ? "통합 매체 제안 보고서" : "Integrated media proposal",
    sections: [
      ...(oohPayload.sections ?? []),
      {
        title: isKo ? "혼합 카트 안내" : "Mixed cart notice",
        lines: [mixedNotice],
      },
    ],
  };
}

/**
 * PR6-b router — split by catalog_channel, delegate to OOH / online / mixed builders.
 * `buildOohReportPayload` is never modified; OOH-only paths call it unchanged.
 */
export function buildReportPayload(
  args: BuildReportPayloadArgs,
): PlannerReportExportPayload {
  const split = splitPortfolioByCatalogChannel(
    args.portfolio,
    args.planCartItems ?? [],
  );

  if (split.composition === "onlyOnline") {
    const onlineArgs = toOnlineArgs(args);
    return buildOnlineReportPayload({
      ...onlineArgs,
      portfolio: split.onlinePortfolio,
      planCartItems: split.onlineCartItems,
      reportGreeting: undefined,
      reportExecutiveSummaryLines: undefined,
    });
  }

  if (split.composition === "mixed") {
    return buildMixedReportPayload(args, split);
  }

  return {
    ...buildOohReportPayload(args),
    reportComposition: "onlyOoh",
  };
}

/** @internal test helper — expose split for unit tests */
export function splitReportPortfolio(
  portfolio: readonly MediaItem[],
  planCartItems?: readonly PlanCartItem[],
) {
  return splitPortfolioByCatalogChannel(portfolio, planCartItems ?? []);
}
