import assert from "node:assert/strict";
import test from "node:test";
import {
  inferIndustryFromText,
  inferTargetsFromText,
  mapMediaTypeKeywords,
  parseBudgetWon,
  parseDurationMonths,
  rfpGroupToMatchingInput,
  RFP_DEFAULT_MONTHLY_BUDGET_WON,
} from "@/lib/rfp-proposal/rfp-group-to-matching";
import type { RfpGroup } from "@/lib/rfp-proposal/types";

const airportGroup: RfpGroup = {
  id: "g-airport",
  label: "공항 권역",
  regionKeywords: ["인천공항 T1", "인천공항 T2"],
  mediaTypeKeywords: ["디지털 사이니지", "DOOH"],
};

const subwayGroup: RfpGroup = {
  id: "g-subway",
  label: "지하철 역사",
  regionKeywords: ["강남", "삼성"],
  mediaTypeKeywords: ["PSD", "스크린도어"],
};

test("mapMediaTypeKeywords: DOOH/사이니지 → digital", () => {
  const m = mapMediaTypeKeywords(["디지털 사이니지", "DOOH"]);
  assert.deepEqual(m.categories, ["digital"]);
  assert.equal(m.mediaIntents, undefined);
});

test("mapMediaTypeKeywords: PSD/스크린도어 → subway intent", () => {
  const m = mapMediaTypeKeywords(["PSD", "스크린도어"]);
  assert.ok(m.mediaIntents?.includes("subway"));
});

test("mapMediaTypeKeywords: 버스 래핑 → bus_wrap + mobile", () => {
  const m = mapMediaTypeKeywords(["버스 래핑"]);
  assert.ok(m.mediaIntents?.includes("bus_wrap"));
  assert.ok(m.categories?.includes("mobile"));
});

test("parseBudgetWon: 한글 만원/억", () => {
  assert.equal(parseBudgetWon("월 800만원"), 8_000_000);
  assert.equal(parseBudgetWon("3,000만"), 30_000_000);
  assert.equal(parseBudgetWon("5억"), 500_000_000);
  assert.equal(parseBudgetWon(""), 0);
});

test("parseDurationMonths: 반기·개월", () => {
  assert.equal(parseDurationMonths("2026년 하반기"), 6);
  assert.equal(parseDurationMonths("3개월"), 3);
  assert.equal(parseDurationMonths(null), 1);
});

test("inferIndustryFromText / inferTargetsFromText", () => {
  assert.equal(inferIndustryFromText("IT / 게이밍 / 테크"), "entertainment");
  assert.equal(inferIndustryFromText("뷰티 브랜드"), "beauty");
  assert.deepEqual(inferTargetsFromText("2030 MZ"), ["mz"]);
  assert.deepEqual(inferTargetsFromText(""), ["mass"]);
});

test("rfpGroupToMatchingInput: 공항 그룹 지역·카테고리 매핑", () => {
  const input = rfpGroupToMatchingInput(airportGroup, {
    industry: "IT / 게이밍",
    target: "테크 소비층",
    period: "2026년 하반기",
  });
  assert.deepEqual(input.regions, ["인천공항 T1", "인천공항 T2"]);
  assert.deepEqual(input.categories, ["digital"]);
  assert.equal(input.goal, "brand");
  assert.equal(input.durationMonths, 6);
  assert.equal(input.monthlyBudgetWon, RFP_DEFAULT_MONTHLY_BUDGET_WON);
  assert.equal(input.industry, "entertainment");
});

test("rfpGroupToMatchingInput: 지하철 그룹 subway intent", () => {
  const input = rfpGroupToMatchingInput(subwayGroup, {
    industry: "tech",
  });
  assert.deepEqual(input.regions, ["강남", "삼성"]);
  assert.ok(input.mediaIntents?.includes("subway"));
  assert.equal(input.industry, "tech");
});
