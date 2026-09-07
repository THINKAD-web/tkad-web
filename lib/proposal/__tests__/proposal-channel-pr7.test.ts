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
      platform: "Meta Instagram",
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
