import assert from "node:assert/strict";
import test from "node:test";
import { plannerReportPricingFootnote } from "@/lib/planner-report-export/pricing-footnote";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import {
  SNAPSHOT_SCENARIOS,
  buildScenarioArgs,
} from "@/lib/planner-report-export/__tests__/payload-snapshot-scenarios";

test("plannerReportPricingFootnote — Korean VAT and production notice", () => {
  const text = plannerReportPricingFootnote(true);
  assert.match(text, /제작비·부가세 별도/);
  assert.match(text, /송출료/);
});

test("buildOohReportPayload — attaches pricingFootnote", () => {
  const scenario = SNAPSHOT_SCENARIOS.find((s) => s.id === "korea-campaign-21d")!;
  const payload = buildOohReportPayload(buildScenarioArgs(scenario));
  assert.equal(payload.pricingFootnote, plannerReportPricingFootnote(true));
});
