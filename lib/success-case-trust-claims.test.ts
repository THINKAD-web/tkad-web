import assert from "node:assert/strict";
import test from "node:test";
import { extractTrustClaimHitsFromSuccessCaseFields } from "@/lib/success-case-trust-claims";

test("detects industry benchmark and CPM lines in results", () => {
  const hits = extractTrustClaimHitsFromSuccessCaseFields({
    id: "x",
    titleKo: "t",
    summaryKo: "",
    challengeKo: "",
    solutionKo: "",
    resultsKo: [
      "DOOH CPM: 약 1,100원 (강남 핵심 상권 기준 업계 평균 대비 18% 효율 개선)",
    ],
    metricsJson: { seed: true },
  });
  assert.ok(hits.some((h) => h.ruleId === "INDUSTRY_BENCHMARK"));
  assert.ok(hits.some((h) => h.ruleId === "SPECIFIC_CPM"));
  assert.ok(hits.some((h) => h.ruleId === "PERCENT_IMPROVEMENT"));
});
