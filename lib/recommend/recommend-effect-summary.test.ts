import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exportReachPendingLine,
  exportRoiPendingLine,
} from "@/lib/planner-report-export/export-kpi";

/** recommend-report-section C안 — reach estimating 시 효과요약 reach/ROI 숫자 생략 */
function buildRecommendEffectSummaryForTest(args: {
  isKo: boolean;
  reachRoiPending: boolean;
  reachCorePct: number;
  reachExtendedPct: number;
  roiExpected: number;
}): string[] {
  const lines = ["imp1", "imp2"];
  if (args.reachRoiPending) {
    lines.push(exportReachPendingLine(args.isKo));
  } else {
    lines.push(`reach ${args.reachCorePct}% / ${args.reachExtendedPct}%`);
  }
  if (args.reachRoiPending) {
    lines.push(exportRoiPendingLine(args.isKo));
  } else {
    lines.push(`roi ${args.roiExpected}`);
  }
  return lines;
}

test("recommend C plan — estimating reach omits percent reach and ROI from effect summary", () => {
  const lines = buildRecommendEffectSummaryForTest({
    isKo: true,
    reachRoiPending: true,
    reachCorePct: 62,
    reachExtendedPct: 38,
    roiExpected: 3.3,
  });
  assert.ok(lines.some((l) => l.includes("행정동 인구 데이터")));
  assert.ok(lines.some((l) => l.includes("기대 ROI")));
  assert.equal(
    lines.some((l) => /62%|3\.3/.test(l)),
    false,
    "must not leak modeled percents while pending",
  );
});

test("recommend — modeled reach may show numeric reach/ROI", () => {
  const lines = buildRecommendEffectSummaryForTest({
    isKo: true,
    reachRoiPending: false,
    reachCorePct: 62,
    reachExtendedPct: 38,
    roiExpected: 3.3,
  });
  assert.ok(lines.some((l) => l.includes("62%")));
  assert.ok(lines.some((l) => l.includes("3.3")));
});
