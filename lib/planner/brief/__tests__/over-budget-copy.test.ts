import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetCoverValue,
  mixVsBudgetFootnote,
  overBudgetBannerLine,
} from "../over-budget-copy.ts";

test("overBudgetBannerLine is the Step 3 MetricsPanel copy", () => {
  assert.equal(
    overBudgetBannerLine(39_000_000, true),
    "예산 초과 ₩39,000,000 — 수량을 줄이거나 예산을 조정해 주세요.",
  );
  assert.equal(overBudgetBannerLine(39_000_000, false), "Over budget by ₩39,000,000.");
});

test("cover and footnote use mix calcMixMetrics rate", () => {
  const rate = 69_000_000 / 30_000_000;
  assert.equal(
    budgetCoverValue({
      requestWon: 30_000_000,
      mixWon: 69_000_000,
      budgetUsedRate: rate,
      isKo: true,
    }),
    "요청 예산 ₩30,000,000 / 이 구성 ₩69,000,000 (230%)",
  );
  assert.equal(mixVsBudgetFootnote(rate, true), "요청 예산 대비 230% 구성입니다");
});
