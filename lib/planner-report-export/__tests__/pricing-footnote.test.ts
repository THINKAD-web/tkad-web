import assert from "node:assert/strict";
import test from "node:test";
import { plannerReportPricingFootnote } from "@/lib/planner-report-export/pricing-footnote";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import {
  SNAPSHOT_SCENARIOS,
  buildScenarioArgs,
} from "@/lib/planner-report-export/__tests__/payload-snapshot-scenarios";

test("plannerReportPricingFootnote — Korean production notice without VAT duplicate", () => {
  const text = plannerReportPricingFootnote(true);
  assert.doesNotMatch(text, /부가세/);
  assert.match(text, /송출료/);
  assert.match(text, /제작·설치/);
});

test("buildOohReportPayload — attaches pricingFootnote", () => {
  const scenario = SNAPSHOT_SCENARIOS.find((s) => s.id === "korea-campaign-21d")!;
  const payload = buildOohReportPayload(buildScenarioArgs(scenario));
  assert.equal(payload.pricingFootnote, plannerReportPricingFootnote(true));
});

test("buildOohReportPayload — disclaimer includes inventory snapshot line", () => {
  const scenario = SNAPSHOT_SCENARIOS.find((s) => s.id === "korea-campaign-21d")!;
  const payload = buildOohReportPayload(buildScenarioArgs(scenario));
  assert.match(payload.disclaimer, /작성 시점 기준/);
  assert.match(payload.disclaimer, /입점 현황/);
});
