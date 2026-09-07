import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  allocateProposalOnlineBudgets,
  buildDeterministicOnlineRoiScenarios,
  buildProposalOnlineFacts,
  splitMixedChannelBudgetWon,
} from "@/lib/proposal/proposal-online-adapter";
import { ONLINE_INSIGHTS_DISCLAIMER_KO } from "@/lib/planner-report-export/online-report-insights";
import {
  buildFallbackProposal,
  buildGeneralFallback,
} from "@/lib/proposal/generate-proposal";
import { estimatePerformance } from "@/lib/pricing/online-performance-estimate";

function onlineMedia(
  id: string,
  minBudget: number,
  cpmMin = 4000,
  cpmMax = 8000,
  platform = "Meta Instagram",
): MediaItem {
  return {
    id,
    slug: id,
    name: `Online ${id}`,
    nameEn: `Online ${id}`,
    type: null,
    region: "online",
    location: "온라인",
    catalogChannel: "online",
    mediaMainCategory: "sns",
    price: null,
    onlineSpec: {
      id: `${id}-spec`,
      platform,
      minBudget,
      cpcMin: 200,
      cpcMax: 600,
      cpmMin,
      cpmMax,
      targetingOptions: [],
      strengths: [],
      kpiHints: [],
      bestFor: [],
    },
  } as MediaItem;
}

const DISCLAIMER_MARKERS = [
  "본 제안서의 온라인 예산 배분",
  "참고용 제안이며",
  "Online budget splits",
  "Reference suggestions only",
];

function strategyBodyLines(strategy: string): string[] {
  return strategy
    .split("\n\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !DISCLAIMER_MARKERS.some((marker) => line.includes(marker)),
    );
}

/** overview가 다르거나, strategy 본문에 고유 문장이 있으면 '눈에 띄게' 다른 것으로 본다 */
function assertNoticeablyDifferentNarrative(
  a: { overview: string; strategy: string },
  b: { overview: string; strategy: string },
  label: string,
): void {
  const overviewDiff = a.overview !== b.overview;
  const setA = new Set(strategyBodyLines(a.strategy));
  const setB = new Set(strategyBodyLines(b.strategy));
  const uniqueLines = [
    ...[...setA].filter((line) => !setB.has(line)),
    ...[...setB].filter((line) => !setA.has(line)),
  ];
  assert.ok(
    overviewDiff || uniqueLines.length > 0,
    `${label}: expected overview or strategy body to differ noticeably`,
  );
}

function onlineFallbackBaseInput(budgetManwon: number) {
  return {
    brandName: "Brand",
    industry: "뷰티",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon,
    regions: ["online"],
    targetAge: "20-34",
    targetGender: "전체",
    targetInterests: "",
    locale: "ko" as const,
  };
}

test("allocateProposalOnlineBudgets — floor + remainder when feasible", () => {
  const portfolio = [
    onlineMedia("a", 500_000),
    onlineMedia("b", 1_000_000),
  ];
  const rows = allocateProposalOnlineBudgets(portfolio, 2_000_000);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.calculable));
  assert.equal(
    rows.reduce((s, r) => s + r.allocatedWon, 0),
    2_000_000,
  );
  assert.ok(rows.every((r) => r.allocatedWon >= r.minBudgetWon));
});

test("allocateProposalOnlineBudgets — below-min lines not calculable", () => {
  const portfolio = [
    onlineMedia("a", 800_000),
    onlineMedia("b", 800_000),
    onlineMedia("c", 800_000),
  ];
  const rows = allocateProposalOnlineBudgets(portfolio, 1_000_000);
  const belowMin = rows.filter((r) => !r.calculable);
  assert.ok(belowMin.length > 0);
  for (const row of belowMin) {
    assert.ok(row.allocatedWon < row.minBudgetWon);
  }
});

test("buildProposalOnlineFacts — fact block includes proposal insight hints (PR6-c reconnect)", () => {
  const portfolio = [
    onlineMedia("a", 500_000),
    onlineMedia("b", 600_000),
  ];
  const input = {
    brandName: "TestBrand",
    industry: "뷰티",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    regions: ["online"],
    targetAge: "20-34",
    targetGender: "전체",
    targetInterests: "",
    locale: "ko" as const,
  };
  const facts = buildProposalOnlineFacts(input, portfolio, 1_000_000);
  assert.ok(facts.section.insights?.pacingPlan.length);
  assert.ok(facts.factBlockMarkdown.includes("제안 집행 페이스"));
  assert.ok(facts.factBlockMarkdown.includes("소재·크리에이티브 제안"));
  assert.ok(facts.factBlockMarkdown.includes("집행 시 유의사항"));
  assert.ok(facts.factBlockMarkdown.includes(ONLINE_INSIGHTS_DISCLAIMER_KO));
  assert.ok(!facts.factBlockMarkdown.includes("소진 페이스"), "report section title leak");
});

test("buildProposalOnlineFacts — metrics match estimatePerformance for calculable lines", () => {
  const portfolio = [onlineMedia("solo", 500_000)];
  const input = {
    brandName: "TestBrand",
    industry: "뷰티",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    regions: ["online"],
    targetAge: "20-34",
    targetGender: "전체",
    targetInterests: "",
    locale: "ko" as const,
  };
  const facts = buildProposalOnlineFacts(input, portfolio, 1_000_000);
  const est = estimatePerformance(portfolio[0]!.onlineSpec!, 1_000_000)!;
  const expectedReach = Math.round((est.reachMin! + est.reachMax!) / 2);
  assert.equal(facts.metrics.estimatedReach, expectedReach);
  assert.ok(facts.strategy.includes("온라인"));
  assert.ok(!facts.strategy.includes("동선"));
});

test("buildFallbackProposal onlyOnline — no OOH foot-traffic zero metrics", () => {
  const portfolio = [onlineMedia("solo", 500_000)];
  const input = {
    brandName: "TestBrand",
    industry: "뷰티",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    regions: ["online"],
    targetAge: "",
    targetGender: "",
    targetInterests: "",
    locale: "ko" as const,
  };
  const out = buildFallbackProposal(input, portfolio);
  assert.ok(out.metrics.estimatedReach > 0);
  assert.ok(out.metrics.estimatedImpressions > 0);
  assert.ok(!out.strategy.includes("상권·동선"));
});

test("splitMixedChannelBudgetWon — count ratio", () => {
  const split = splitMixedChannelBudgetWon(10_000_000, 1, 3);
  assert.equal(split.onlineBudgetWon, 7_500_000);
  assert.equal(split.oohBudgetWon, 2_500_000);
});

test("buildDeterministicOnlineRoiScenarios — 3 cases from reach mid", () => {
  const rows = buildDeterministicOnlineRoiScenarios(100_000, true);
  assert.equal(rows.length, 3);
  assert.equal(rows[1]!.reach, 100_000);
  assert.ok(rows[0]!.reach < rows[2]!.reach);
});

test("buildGeneralFallback integrated+online — roi_scenario deterministic", () => {
  const portfolio = [onlineMedia("a", 500_000), onlineMedia("b", 600_000)];
  const out = buildGeneralFallback(
    {
      type: "integrated",
      brandName: "B",
      industry: "F&B",
      campaignName: "T",
      goal: "awareness",
      budgetManwon: 500,
      regions: ["서울"],
      locale: "ko",
    },
    "integrated",
    ["cover", "strategy", "roi_scenario", "budget", "media_recommend"],
    portfolio,
    [],
  );
  assert.ok(out.roiScenarios && out.roiScenarios.length === 3);
  assert.ok(out.metrics && out.metrics.estimatedReach > 0);
  assert.ok(out.overview?.includes("온라인") || out.overview?.includes("Online"));
});

test("fallback narrative — different industries yield different strategy copy", () => {
  const portfolio = [onlineMedia("solo", 500_000)];
  const base = {
    brandName: "Brand",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    regions: ["online"],
    targetAge: "",
    targetGender: "",
    targetInterests: "",
    locale: "ko" as const,
  };
  const beauty = buildFallbackProposal({ ...base, industry: "뷰티" }, portfolio);
  const fintech = buildFallbackProposal({ ...base, industry: "핀테크" }, portfolio);
  assert.notEqual(beauty.strategy, fintech.strategy);
  assert.equal(beauty.metrics.estimatedReach, fintech.metrics.estimatedReach);
});

test("fallback narrative — same input yields stable strategy copy", () => {
  const portfolio = [onlineMedia("solo", 500_000)];
  const input = {
    brandName: "Stable",
    industry: "뷰티",
    campaignName: "캠페인",
    goal: "awareness" as const,
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    regions: ["online"],
    targetAge: "",
    targetGender: "",
    targetInterests: "",
    locale: "ko" as const,
  };
  const a = buildFallbackProposal(input, portfolio);
  const b = buildFallbackProposal(input, portfolio);
  assert.equal(a.strategy, b.strategy);
  assert.equal(a.overview, b.overview);
});

test("fallback narrative — same industry/goal, different budget yields noticeably different copy", () => {
  const portfolio = [
    onlineMedia("meta-a", 500_000),
    onlineMedia("meta-b", 600_000),
  ];
  const at100 = buildFallbackProposal(onlineFallbackBaseInput(100), portfolio);
  const at150 = buildFallbackProposal(onlineFallbackBaseInput(150), portfolio);

  assertNoticeablyDifferentNarrative(at100, at150, "budget 100 vs 150");
  assert.notEqual(at100.overview, at150.overview);
  assert.notEqual(at100.strategy, at150.strategy);
  assert.notEqual(
    at100.metrics.estimatedReach,
    at150.metrics.estimatedReach,
    "metrics should reflect budget via estimatePerformance",
  );
});

test("fallback narrative — one media swap yields noticeably different copy", () => {
  const portfolioAb = [
    onlineMedia("meta-a", 500_000, 4000, 8000, "Meta Instagram"),
    onlineMedia("meta-b", 600_000, 4000, 8000, "Meta Instagram"),
  ];
  const portfolioAc = [
    onlineMedia("meta-a", 500_000, 4000, 8000, "Meta Instagram"),
    onlineMedia("naver-c", 600_000, 4000, 8000, "Naver GFA"),
  ];
  const input = onlineFallbackBaseInput(100);
  const mixAb = buildFallbackProposal(input, portfolioAb);
  const mixAc = buildFallbackProposal(input, portfolioAc);

  assertNoticeablyDifferentNarrative(mixAb, mixAc, "media b vs naver-c");
  assert.notEqual(mixAb.overview, mixAc.overview);
  assert.ok(mixAb.overview.includes("Meta Instagram"));
  assert.ok(mixAc.overview.includes("Naver GFA"));
  assert.ok(
    strategyBodyLines(mixAb.strategy).some((line) => line.includes("Meta Instagram")),
  );
  assert.ok(
    strategyBodyLines(mixAc.strategy).some((line) => line.includes("Naver GFA")),
  );
  assert.equal(
    mixAb.metrics.estimatedReach,
    mixAc.metrics.estimatedReach,
    "same budget split → same reach when specs comparable",
  );
});
