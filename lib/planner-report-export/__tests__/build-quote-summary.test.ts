import assert from "node:assert/strict";
import test from "node:test";
import { buildPlannerQuoteSummary } from "@/lib/planner-report-export/build-quote-summary";

test("buildPlannerQuoteSummary — VAT on media + production, SSOT mixWon", () => {
  const summary = buildPlannerQuoteSummary({
    mixWon: 10_000_000,
    productionCostWon: 2_000_000,
    isKo: true,
  });
  assert.ok(summary);
  assert.equal(summary!.supplyWon, 10_000_000);
  assert.equal(summary!.productionWon, 2_000_000);
  assert.equal(summary!.vatWon, 1_200_000);
  assert.equal(summary!.totalWon, 13_200_000);
  assert.equal(summary!.totalLabel, "총액 (부가세 포함)");
  assert.equal(summary!.quoteOnlyLine, undefined);
  assert.equal(summary!.footnotes.length, 0);
});

test("buildPlannerQuoteSummary — quote-only line excluded from totals", () => {
  const summary = buildPlannerQuoteSummary({
    mixWon: 5_000_000,
    productionCostWon: 0,
    quoteOnlyNotice: { count: 2, groupLabel: "외벽" },
    isKo: true,
  });
  assert.ok(summary);
  assert.equal(summary!.supplyWon, 5_000_000);
  assert.equal(summary!.vatWon, 500_000);
  assert.equal(summary!.totalWon, 5_500_000);
  assert.equal(summary!.totalLabel, "합계 (부가세 포함 · 협의 매체 제외)");
  assert.match(summary!.quoteOnlyLine!.label, /외벽 2건 — 별도 협의/);
  assert.equal(summary!.quoteOnlyLine!.amountLabel, "문의");
  assert.equal(summary!.footnotes.length, 1);
  assert.match(summary!.footnotes[0]!, /외벽 2건은 별도 협의 후 추가됩니다/);
});

test("buildPlannerQuoteSummary — undefined when no mix and no quote-only", () => {
  const summary = buildPlannerQuoteSummary({
    mixWon: 0,
    productionCostWon: 0,
    isKo: true,
  });
  assert.equal(summary, undefined);
});

test("buildPlannerQuoteSummary — quote-only only still renders", () => {
  const summary = buildPlannerQuoteSummary({
    mixWon: 0,
    quoteOnlyNotice: { count: 1, groupLabel: "외벽" },
    isKo: false,
  });
  assert.ok(summary);
  assert.equal(summary!.supplyWon, 0);
  assert.match(summary!.quoteOnlyLine!.label, /1 외벽 — inquiry/);
});

test("buildPlannerQuoteSummary — custom line footnote distinct from quote_only", () => {
  const summary = buildPlannerQuoteSummary({
    mixWon: 10_000_000,
    productionCostWon: 2_000_000,
    quoteOnlyNotice: { count: 1, groupLabel: "협의가" },
    customLineCount: 1,
    isKo: true,
  });
  assert.ok(summary);
  assert.equal(summary!.footnotes.length, 2);
  assert.ok(summary!.footnotes.some((f) => f.includes("별도 협의 후 추가")));
  assert.ok(summary!.footnotes.some((f) => f.includes("공급가에 포함")));
});
