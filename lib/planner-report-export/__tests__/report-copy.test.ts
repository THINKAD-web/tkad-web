import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefaultExecutiveSummaryLines,
  buildDefaultReportGreeting,
  computeReportCopyFingerprint,
  isReportCopyStale,
  splitReportCopyParagraphs,
} from "@/lib/planner-report-export/report-copy";

test("computeReportCopyFingerprint — 매체·수량 변경 감지", () => {
  const a = computeReportCopyFingerprint({
    mediaIds: ["m1", "m2"],
    quantities: { m1: 1, m2: 2 },
  });
  const b = computeReportCopyFingerprint({
    mediaIds: ["m1", "m2"],
    quantities: { m1: 1, m2: 3 },
  });
  const c = computeReportCopyFingerprint({
    mediaIds: ["m1", "m2", "m3"],
    quantities: { m1: 1, m2: 2, m3: 1 },
  });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test("isReportCopyStale — touched + fingerprint 불일치만 true", () => {
  assert.equal(
    isReportCopyStale({
      copyFingerprint: "old",
      greetingTouched: true,
      executiveSummaryTouched: false,
      currentFingerprint: "new",
    }),
    true,
  );
  assert.equal(
    isReportCopyStale({
      copyFingerprint: "same",
      greetingTouched: true,
      executiveSummaryTouched: false,
      currentFingerprint: "same",
    }),
    false,
  );
  assert.equal(
    isReportCopyStale({
      copyFingerprint: "old",
      greetingTouched: false,
      executiveSummaryTouched: false,
      currentFingerprint: "new",
    }),
    false,
  );
});

test("buildDefaultReportGreeting — 광고주명 반영", () => {
  assert.match(
    buildDefaultReportGreeting(true, "OO브랜드"),
    /OO브랜드님/,
  );
});

test("buildDefaultExecutiveSummaryLines — 매체 수 포함, 노출 숫자 없음", () => {
  const lines = buildDefaultExecutiveSummaryLines({
    isKo: true,
    campaignGoal: "brand",
    goalTitle: "브랜드 인지도",
    industryKey: "indRetail",
    industryText: "리테일",
    regionsText: "서울",
    seoulZones: [],
    followUp: {},
    portfolioCount: 3,
    topMediaName: "핵심 매체 A",
  });
  assert.ok(lines.some((l) => l.includes("3개 매체")));
  assert.ok(!lines.some((l) => /\d{2,}[,]?\d*\s*회/.test(l)));
});

test("splitReportCopyParagraphs", () => {
  assert.deepEqual(splitReportCopyParagraphs("a\n\nb\n"), ["a", "b"]);
});
