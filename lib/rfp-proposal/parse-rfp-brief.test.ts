import assert from "node:assert/strict";
import test from "node:test";
import { assertZhitaiBrief } from "@/lib/rfp-proposal/assert-zhitai";
import { ZHITAI_RFP_EMAIL } from "@/lib/rfp-proposal/fixtures/zhitai-rfp";
import { heuristicParseRfpBrief } from "@/lib/rfp-proposal/heuristic-parse";
import { normalizeRfpProposalBrief } from "@/lib/rfp-proposal/normalize";
import { parseRfpProposalBrief } from "@/lib/rfp-proposal/parse-rfp-brief";
import { rfpProposalBriefSchema } from "@/lib/rfp-proposal/types";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";

test("normalizeRfpProposalBrief: tool output → valid schema", () => {
  const brief = normalizeRfpProposalBrief({
    campaign: {
      brandName: "ZHITAI",
      target: "IT / 게이밍 / 테크 소비층",
      period: "2026년 하반기",
    },
    groups: [
      {
        label: "공항 권역",
        regionKeywords: ["인천공항 T1", "인천공항 T2"],
        mediaTypeKeywords: ["디지털 사이니지", "DOOH"],
      },
      {
        label: "핵심 상권",
        regionKeywords: ["코엑스 K-POP광장", "강남"],
        mediaTypeKeywords: ["DOOH"],
      },
      {
        label: "지하철 역사",
        regionKeywords: ["강남", "삼성"],
        mediaTypeKeywords: ["PSD", "스크린도어"],
      },
    ],
  });
  assert.ok(brief);
  assert.equal(brief!.groups.length, 3);
  assert.ok(rfpProposalBriefSchema.safeParse(brief).success);
  assertZhitaiBrief(brief!);
});

test("heuristicParseRfpBrief: ZHITAI 이메일 → 3그룹 + 공통 메타", () => {
  const brief = heuristicParseRfpBrief(ZHITAI_RFP_EMAIL);
  assert.ok(brief, "heuristic should parse ZHITAI fixture");
  assertZhitaiBrief(brief!);
});

test("parseRfpProposalBrief: heuristicOnly ZHITAI", async () => {
  const { brief, source } = await parseRfpProposalBrief(ZHITAI_RFP_EMAIL, {
    heuristicOnly: true,
    locale: "ko",
  });
  assert.equal(source, "heuristic");
  assertZhitaiBrief(brief);
});

test("확인/수정: 추출 그룹 라벨·키워드 수동 교정 가능", async () => {
  const { brief } = await parseRfpProposalBrief(ZHITAI_RFP_EMAIL, {
    heuristicOnly: true,
  });
  const edited = {
    ...brief,
    groups: brief.groups.map((g) =>
      g.label.includes("공항")
        ? {
            ...g,
            label: "공항 권역 (수정)",
            regionKeywords: [...g.regionKeywords, "김포공항"],
          }
        : g,
    ),
  };
  assert.ok(edited.groups.some((g) => g.label === "공항 권역 (수정)"));
  assert.ok(
    edited.groups.some((g) => g.regionKeywords.includes("김포공항")),
  );
  assert.ok(rfpProposalBriefSchema.safeParse(edited).success);
});

test("회귀: parsePlannerFreetextBrief 동작 유지", () => {
  const r = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  assert.equal(r.fields.campaignGoal.value, "brand");
  assert.equal(r.fields.budgetMan.value, 3000);
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});
