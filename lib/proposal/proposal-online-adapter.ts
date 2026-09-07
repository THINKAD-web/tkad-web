import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { formatKpiRange } from "@/lib/digital/mix-engine";
import {
  buildOnlineReportSection,
  type BuildOnlineReportPayloadArgs,
} from "@/lib/planner-report-export/payload-online";
import type {
  PlannerExportOnlineInsights,
  PlannerExportOnlineSection,
} from "@/lib/planner-report-export/types";
import {
  ONLINE_INSIGHTS_DISCLAIMER_EN,
  ONLINE_INSIGHTS_DISCLAIMER_KO,
} from "@/lib/planner-report-export/online-report-insights";
import {
  buildOnlineReportCopyDraft,
} from "@/lib/planner-report-export/report-copy-online";
import {
  buildOnlineReportStrategyLines,
  buildOnlineReportWhyLine,
} from "@/lib/planner/report-strategy-online";
import {
  estimateImpressionsFromBudget,
  estimatePerformance,
  hasOnlinePricingSpec,
} from "@/lib/pricing/online-performance-estimate";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";
import type {
  CampaignProposalOutput,
  ProposalGoal,
  ProposalInput,
  StudioProposalInput,
} from "@/lib/proposal/types";
import { proposalGoalToPlanner } from "@/lib/proposal/prefill-from-planner";

export const PROPOSAL_ONLINE_BUDGET_DISCLAIMER_KO =
  "본 제안서의 온라인 예산 배분은 플래너 카트와 다를 수 있으며, 최소 집행금액 미달 채널은 견적 참고용입니다.";

/** @deprecated Import ONLINE_INSIGHTS_DISCLAIMER_KO from online-report-insights.ts */
export const PROPOSAL_ONLINE_INSIGHTS_DISCLAIMER_KO = ONLINE_INSIGHTS_DISCLAIMER_KO;

export const PROPOSAL_ONLINE_BUDGET_DISCLAIMER_EN =
  "Online budget splits in this proposal may differ from the plan cart; channels below minimum spend are indicative only.";

export const PROPOSAL_ONLINE_INSIGHTS_DISCLAIMER_EN = ONLINE_INSIGHTS_DISCLAIMER_EN;

export type OnlineBudgetAllocation = {
  mediaId: string;
  allocatedWon: number;
  minBudgetWon: number;
  calculable: boolean;
};

export type ProposalOnlineFacts = {
  allocations: OnlineBudgetAllocation[];
  section: PlannerExportOnlineSection;
  overview: string;
  strategy: string;
  metrics: CampaignProposalOutput["metrics"];
  budgetAllocation: CampaignProposalOutput["budgetAllocation"];
  budgetSharePctByMediaId: Map<string, number>;
  factBlockMarkdown: string;
  disclaimer: string;
  reachMid: number;
  clicksMid: number;
};

export type ProposalBriefInput = Pick<
  ProposalInput,
  | "brandName"
  | "industry"
  | "campaignName"
  | "goal"
  | "startDate"
  | "endDate"
  | "budgetManwon"
  | "regions"
  | "targetAge"
  | "targetGender"
  | "targetInterests"
  | "locale"
>;

function distributeFlooredAmounts(raw: number[], totalWon: number): number[] {
  const floored = raw.map((x) => Math.floor(x));
  let remainder = totalWon - floored.reduce((s, x) => s + x, 0);
  const order = [...raw.entries()].sort((a, b) => b[1] - a[1]).map(([i]) => i);
  let idx = 0;
  while (remainder > 0 && order.length > 0) {
    floored[order[idx % order.length]!]! += 1;
    remainder -= 1;
    idx += 1;
  }
  return floored;
}

/** minBudget floor + proportional remainder when feasible; else proportional + below-min gate. */
export function allocateProposalOnlineBudgets(
  portfolio: readonly MediaItem[],
  totalWon: number,
): OnlineBudgetAllocation[] {
  if (portfolio.length === 0 || totalWon <= 0) return [];

  const rows = portfolio.map((m) => ({
    mediaId: m.id,
    media: m,
    minBudgetWon: m.onlineSpec?.minBudget ?? 0,
  }));
  const sumMin = rows.reduce((s, r) => s + r.minBudgetWon, 0);

  let amounts: number[];
  if (sumMin > 0 && totalWon >= sumMin) {
    const remainder = totalWon - sumMin;
    const raw = rows.map(
      (r) => r.minBudgetWon + remainder * (r.minBudgetWon / sumMin),
    );
    amounts = distributeFlooredAmounts(raw, totalWon);
  } else if (sumMin > 0) {
    const raw = rows.map((r) => totalWon * (r.minBudgetWon / sumMin));
    amounts = distributeFlooredAmounts(raw, totalWon);
  } else {
    const each = Math.floor(totalWon / rows.length);
    amounts = rows.map((_, i) =>
      i === 0 ? totalWon - each * (rows.length - 1) : each,
    );
  }

  return rows.map((r, i) => {
    const allocatedWon = amounts[i]!;
    const meetsMin = r.minBudgetWon <= 0 || allocatedWon >= r.minBudgetWon;
    const calculable =
      meetsMin && hasOnlinePricingSpec(r.media.onlineSpec ?? undefined);
    return {
      mediaId: r.mediaId,
      allocatedWon,
      minBudgetWon: r.minBudgetWon,
      calculable,
    };
  });
}

export function splitMixedChannelBudgetWon(
  totalWon: number,
  oohCount: number,
  onlineCount: number,
): { oohBudgetWon: number; onlineBudgetWon: number } {
  const totalCount = oohCount + onlineCount;
  if (totalCount <= 0) return { oohBudgetWon: totalWon, onlineBudgetWon: 0 };
  const onlineBudgetWon = Math.round(totalWon * (onlineCount / totalCount));
  return {
    onlineBudgetWon,
    oohBudgetWon: totalWon - onlineBudgetWon,
  };
}

export function buildSyntheticOnlineCartItems(
  portfolio: readonly MediaItem[],
  allocations: readonly OnlineBudgetAllocation[],
): PlanCartItem[] {
  const allocById = new Map(allocations.map((a) => [a.mediaId, a]));
  return portfolio.map((m) => {
    const alloc = allocById.get(m.id)!;
    return {
      mediaId: m.id,
      mediaName: m.name,
      mediaType: m.type ?? "online",
      catalogChannel: "online",
      lineTotalWon: alloc.allocatedWon,
      region: m.region ?? "online",
      price: m.price ?? 0,
      addedFrom: "planner",
      addedAt: new Date().toISOString(),
    };
  });
}

function goalTitleFromProposal(goal: ProposalGoal, isKo: boolean): string {
  if (!isKo) return goal;
  switch (goal) {
    case "awareness":
      return "브랜드 인지도";
    case "conversion":
      return "전환·실적";
    case "event":
      return "이벤트·프로모션";
  }
}

function resolveProposalCampaignMonths(
  startDate: string,
  endDate: string,
): number | undefined {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const daySpan = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
  return Math.max(1, Math.round(daySpan / 30));
}

function toOnlineReportArgs(
  input: ProposalBriefInput,
  portfolio: readonly MediaItem[],
  planCartItems: PlanCartItem[],
  onlineBudgetWon: number,
): BuildOnlineReportPayloadArgs {
  const isKo = input.locale !== "en";
  const campaignGoal = proposalGoalToPlanner(input.goal) as PlannerCampaignGoal;
  return {
    isKo,
    goalTitle: goalTitleFromProposal(input.goal, isKo),
    budgetMan: Math.round(onlineBudgetWon / 10_000),
    periodDisplay: `${input.startDate} ~ ${input.endDate}`,
    regionsText: input.regions.join(", ") || (isKo ? "미지정" : "Not specified"),
    categoriesText: isKo ? "미지정" : "Not specified",
    ageText: input.targetAge || (isKo ? "미지정" : "Not specified"),
    industryText: input.industry,
    campaignGoal,
    portfolio: [...portfolio],
    planCartItems,
    generatedAt: new Date().toISOString(),
    months: resolveProposalCampaignMonths(input.startDate, input.endDate),
    clientName: input.brandName,
  };
}

/** Proposal fact-block tone — same signals as report insights, not verbatim report copy. */
function proposalInsightLine(text: string, isKo: boolean): string {
  if (!isKo) return text;
  return text
    .replace(/^초기 1~2주:/, "1~2주차에는")
    .replace(/에 집중합니다\.?$/, "을 제안합니다.")
    .replace(/을 권장합니다\.?$/, "을 제안드립니다.")
    .replace(/하세요\.?$/, "하는 방안을 검토하세요.")
    .replace(/목표로 하세요\.?$/, "일정을 전제로 제안합니다.");
}

function applyCalculabilityGate(
  section: PlannerExportOnlineSection,
  allocations: readonly OnlineBudgetAllocation[],
  portfolio: readonly MediaItem[],
  input: ProposalBriefInput,
): PlannerExportOnlineSection {
  const calcById = new Map(allocations.map((a) => [a.mediaId, a.calculable]));
  const isKo = input.locale !== "en";

  const lines = section.lines.map((line) => {
    if (calcById.get(line.mediaId)) return line;
    return {
      ...line,
      hasEstimate: false,
      reachLabel: null,
      clicksLabel: null,
    };
  });

  let reachMin = 0;
  let reachMax = 0;
  let clicksMin = 0;
  let clicksMax = 0;
  let hasReach = false;
  let hasClicks = false;

  for (const line of lines) {
    if (!line.hasEstimate) continue;
    const media = portfolio.find((m) => m.id === line.mediaId);
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

  const calculableLineCount = lines.filter((l) => l.hasEstimate).length;
  const inquiryLineCount = lines.length - calculableLineCount;

  const strategyInput = {
    isKo,
    campaignGoal: proposalGoalToPlanner(input.goal) as PlannerCampaignGoal,
    goalTitle: goalTitleFromProposal(input.goal, isKo),
    industryKey: null,
    industryText: input.industry,
    onlineLineCount: lines.length,
    calculableLineCount,
    inquiryLineCount,
  };

  return {
    ...section,
    lines,
    calculableLineCount,
    inquiryLineCount,
    reachLabel: hasReach ? formatKpiRange(reachMin, reachMax) : null,
    clicksLabel: hasClicks ? formatKpiRange(clicksMin, clicksMax) : null,
    strategyLines: buildOnlineReportStrategyLines(strategyInput),
    whyLine: buildOnlineReportWhyLine(strategyInput),
  };
}

function aggregateOnlineMetrics(
  section: PlannerExportOnlineSection,
  portfolio: readonly MediaItem[],
  allocations: readonly OnlineBudgetAllocation[],
  totalBudgetWon: number,
): { metrics: CampaignProposalOutput["metrics"]; reachMid: number; clicksMid: number } {
  let reachMid = 0;
  let clicksMid = 0;
  let impressionsMid = 0;

  for (const alloc of allocations) {
    if (!alloc.calculable) continue;
    const media = portfolio.find((m) => m.id === alloc.mediaId);
    if (!media?.onlineSpec) continue;
    const est = estimatePerformance(media.onlineSpec, alloc.allocatedWon);
    if (est?.reachMin != null && est.reachMax != null) {
      reachMid += Math.round((est.reachMin + est.reachMax) / 2);
    }
    if (est?.clicksMin != null && est.clicksMax != null) {
      clicksMid += Math.round((est.clicksMin + est.clicksMax) / 2);
    }
    impressionsMid += estimateImpressionsFromBudget(
      media.onlineSpec,
      alloc.allocatedWon,
    );
  }

  const estimatedReach = reachMid > 0 ? reachMid : clicksMid;
  const estimatedImpressions =
    impressionsMid > 0 ? impressionsMid : estimatedReach;
  const estimatedCpm =
    estimatedImpressions > 0
      ? Math.round((totalBudgetWon / estimatedImpressions) * 1000)
      : 0;

  return {
    metrics: { estimatedImpressions, estimatedReach, estimatedCpm },
    reachMid: estimatedReach,
    clicksMid,
  };
}

function appendProposalInsightFactBlocks(
  lines: string[],
  insights: PlannerExportOnlineInsights | undefined,
  isKo: boolean,
): void {
  if (!insights) return;

  lines.push("");
  lines.push(
    isKo
      ? "### 제안 집행 페이스 (서사 힌트 — KPI·예산 숫자 변경 금지)"
      : "### Proposed pacing (narrative hint — do not change KPI/budget numbers)",
  );
  lines.push(
    isKo
      ? "제안서 overview/strategy에 자연스럽게 녹일 집행 리듬입니다. 보고서 PDF 문구를 그대로 복사하지 마세요."
      : "Weave pacing into proposal narrative naturally; do not copy report PDF wording verbatim.",
  );
  for (const phase of insights.pacingPlan) {
    lines.push(
      `- ${phase.label} (${phase.sharePct}%): ${proposalInsightLine(phase.description, isKo)}`,
    );
  }

  if (insights.creativeDirections.length > 0) {
    lines.push("");
    lines.push(
      isKo
        ? "### 소재·크리에이티브 제안 (서사 힌트)"
        : "### Creative direction (narrative hint)",
    );
    lines.push(
      isKo
        ? "플랫폼 특성에 맞는 소재 방향 — 제안서 톤으로 재서술 가능, KPI는 위 수치 유지."
        : "Platform-fit creative angles — rephrase for proposal tone; keep KPI figures above.",
    );
    for (const line of insights.creativeDirections) {
      lines.push(`- ${proposalInsightLine(line, isKo)}`);
    }
  }

  if (insights.operationalNotes.length > 0) {
    lines.push("");
    lines.push(
      isKo
        ? "### 집행 시 유의사항 (서사 힌트)"
        : "### Operations notes (narrative hint)",
    );
    for (const note of insights.operationalNotes) {
      lines.push(`- ${proposalInsightLine(note, isKo)}`);
    }
  }

  lines.push("");
  lines.push(`> ${insights.disclaimer}`);
}

function buildFactBlockMarkdown(
  section: PlannerExportOnlineSection,
  allocations: readonly OnlineBudgetAllocation[],
  isKo: boolean,
): string {
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  const lines = [
    "## 사전 계산된 온라인 KPI/인사이트 (DO NOT invent or override these numbers)",
    section.reachLabel
      ? `- ${isKo ? "예상 도달" : "Est. reach"}: ${section.reachLabel}`
      : `- ${isKo ? "예상 도달" : "Est. reach"}: ${isKo ? "별도 협의" : "Consultation"}`,
    section.clicksLabel
      ? `- ${isKo ? "예상 클릭" : "Est. clicks"}: ${section.clicksLabel}`
      : null,
    `- ${isKo ? "총 온라인 예산" : "Total online budget"}: ₩${fmt(section.totalBudgetWon)}`,
    "",
    "### 채널별 배분",
    ...allocations.map((a) => {
      const line = section.lines.find((l) => l.mediaId === a.mediaId);
      const status = a.calculable
        ? line?.reachLabel ?? line?.clicksLabel ?? "OK"
        : isKo
          ? "최소 집행금액 미달 · 별도 협의"
          : "Below min budget · consultation";
      return `- ${line?.name ?? a.mediaId}: ₩${fmt(a.allocatedWon)} (${status})`;
    }),
  ];
  appendProposalInsightFactBlocks(lines, section.insights, isKo);
  return lines.filter(Boolean).join("\n");
}

export function buildProposalOnlineFacts(
  input: ProposalBriefInput,
  onlinePortfolio: readonly MediaItem[],
  onlineBudgetWon: number,
): ProposalOnlineFacts {
  const isKo = input.locale !== "en";
  const allocations = allocateProposalOnlineBudgets(onlinePortfolio, onlineBudgetWon);
  const planCartItems = buildSyntheticOnlineCartItems(onlinePortfolio, allocations);
  const args = toOnlineReportArgs(input, onlinePortfolio, planCartItems, onlineBudgetWon);
  const rawSection = buildOnlineReportSection(args);
  const section = applyCalculabilityGate(
    rawSection,
    allocations,
    onlinePortfolio,
    input,
  );

  const copy = buildOnlineReportCopyDraft({
    isKo,
    campaignGoal: proposalGoalToPlanner(input.goal) as PlannerCampaignGoal,
    goalTitle: goalTitleFromProposal(input.goal, isKo),
    industryKey: null,
    industryText: input.industry,
    onlineLineCount: section.lines.length,
    calculableLineCount: section.calculableLineCount,
    inquiryLineCount: section.inquiryLineCount,
    clientName: input.brandName,
  });

  const { metrics, reachMid, clicksMid } = aggregateOnlineMetrics(
    section,
    onlinePortfolio,
    allocations,
    onlineBudgetWon,
  );

  const budgetSharePctByMediaId = new Map<string, number>();
  const budgetAllocation = allocations.map((a) => {
    const line = section.lines.find((l) => l.mediaId === a.mediaId);
    const sharePct =
      onlineBudgetWon > 0
        ? Math.round((a.allocatedWon / onlineBudgetWon) * 1000) / 10
        : 0;
    budgetSharePctByMediaId.set(a.mediaId, sharePct);
    return {
      label: line?.name ?? a.mediaId,
      amountWon: a.allocatedWon,
      sharePct,
    };
  });

  const disclaimer = isKo
    ? `${PROPOSAL_ONLINE_BUDGET_DISCLAIMER_KO} ${ONLINE_INSIGHTS_DISCLAIMER_KO}`
    : `${PROPOSAL_ONLINE_BUDGET_DISCLAIMER_EN} ${ONLINE_INSIGHTS_DISCLAIMER_EN}`;

  return {
    allocations,
    section,
    overview: copy.greeting,
    strategy: `${copy.executiveSummary}\n\n${disclaimer}`,
    metrics,
    budgetAllocation,
    budgetSharePctByMediaId,
    factBlockMarkdown: buildFactBlockMarkdown(section, allocations, isKo),
    disclaimer,
    reachMid,
    clicksMid,
  };
}

export function studioInputToProposalBrief(
  input: StudioProposalInput,
): ProposalBriefInput {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return {
    brandName: input.brandName,
    industry: input.industry,
    campaignName: input.campaignName || input.industry,
    goal: input.goal ?? "awareness",
    startDate: input.startDate ?? today,
    endDate: input.endDate ?? end.toISOString().slice(0, 10),
    budgetManwon: input.budgetManwon || 0,
    regions: input.regions,
    targetAge: input.targetAge,
    targetGender: input.targetGender ?? "",
    targetInterests: input.targetInterests ?? "",
    locale: input.locale ?? "ko",
  };
}

export type ProposalRoiScenario = {
  scenario: "conservative" | "base" | "aggressive";
  label: string;
  impressions: number;
  reach: number;
  conversions?: number;
  note: string;
};

/** Deterministic ROI 3-case from online reach midpoint — Studio roi_scenario minimal path. */
export function buildDeterministicOnlineRoiScenarios(
  reachMid: number,
  isKo: boolean,
): ProposalRoiScenario[] {
  if (reachMid <= 0) return [];
  return [
    {
      scenario: "conservative",
      label: isKo ? "보수" : "Conservative",
      impressions: Math.round(reachMid * 0.85),
      reach: Math.round(reachMid * 0.85),
      note: isKo ? "도달 기준 하한 (시드 CPC/CPM)" : "Reach lower bound (seed CPC/CPM)",
    },
    {
      scenario: "base",
      label: isKo ? "기본" : "Base",
      impressions: reachMid,
      reach: reachMid,
      note: isKo ? "도달 기준 중간값" : "Reach midpoint",
    },
    {
      scenario: "aggressive",
      label: isKo ? "공격" : "Aggressive",
      impressions: Math.round(reachMid * 1.15),
      reach: Math.round(reachMid * 1.15),
      note: isKo ? "도달 기준 상한" : "Reach upper bound",
    },
  ];
}

export function onlinePortfolioFromMedia(
  selectedMedia: readonly MediaItem[],
): MediaItem[] {
  return selectedMedia.filter(isOnlineCatalogMedia);
}

export function oohPortfolioFromMedia(
  selectedMedia: readonly MediaItem[],
): MediaItem[] {
  return selectedMedia.filter((m) => !isOnlineCatalogMedia(m));
}
