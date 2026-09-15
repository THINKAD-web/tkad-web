import assert from "node:assert/strict";
import test from "node:test";
import {
  mediaMatchesBillboardIntent,
  mediaMatchesPlannerBusShelterIntent,
} from "@/lib/planner-logic";
import { parseFreetextMediaIntents } from "@/lib/recommend/freetext-media-intents";
import { buildAiRecommendInputFromFreetext } from "@/lib/recommend/build-freetext-recommend-input";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";
import { applyFreetextRecommendDraftDefaults } from "@/lib/recommend/freetext-recommend-defaults";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import { matchMediaCatalog, matchPrecisionLabel } from "@/lib/matching-engine";
import type { MediaItem } from "@/lib/media-data";

test("parseFreetextMediaIntents: 전광판 → billboard", () => {
  assert.ok(parseFreetextMediaIntents("홍대 전광판").includes("billboard"));
  assert.ok(parseFreetextMediaIntents("코엑스 LED 전광판").includes("billboard"));
  assert.ok(!parseFreetextMediaIntents("홍대 지하철 역사").includes("billboard"));
});

test("parseFreetextMediaIntents: 쉘터 → bus_shelter", () => {
  assert.ok(parseFreetextMediaIntents("서울 쉘터 3000만원").includes("bus_shelter"));
  assert.ok(parseFreetextMediaIntents("버스쉘터 프로모션").includes("bus_shelter"));
  assert.ok(!parseFreetextMediaIntents("홍대 전광판").includes("bus_shelter"));
});

test("mediaMatchesBillboardIntent distinguishes wrap vs board", () => {
  assert.equal(
    mediaMatchesBillboardIntent({
      id: "a",
      name: "신촌 31 전광판 광고",
      type: "dooh",
      subCategory: "전광판",
      mediaSubCategory: "digital_signage",
    } as MediaItem),
    true,
  );
  assert.equal(
    mediaMatchesBillboardIntent({
      id: "b",
      name: "지하철 2호선 홍대입구역 아트래핑 광고",
      type: "dooh",
      subCategory: "지하철",
      mediaSubCategory: "subway_station",
    } as MediaItem),
    false,
  );
});

test("matchPrecisionLabel", () => {
  assert.equal(matchPrecisionLabel("exact", true), "정확 매칭");
  assert.equal(matchPrecisionLabel("near", true), "인근·유사 추천");
  assert.equal(matchPrecisionLabel("exact", false), "Exact match");
});

test("mediaMatchesPlannerBusShelterIntent matches bus/smart shelter", () => {
  assert.equal(
    mediaMatchesPlannerBusShelterIntent({
      id: "s1",
      name: "홍대입구역 스마트쉘터 광고",
      type: "static",
      subCategory: "정류장",
    } as MediaItem),
    true,
  );
  assert.equal(
    mediaMatchesPlannerBusShelterIntent({
      id: "b1",
      name: "강남 LED 전광판",
      type: "dooh",
      subCategory: "전광판",
    } as MediaItem),
    false,
  );
});

test("matchMediaCatalog: 서울 쉘터 intent ranks shelter above billboard", () => {
  const raw = "서울 쉘터 3000만원";
  const parsed = parsePlannerFreetextBrief(raw);
  const { draft } = applyFreetextRecommendDraftDefaults(
    { goal: "", target: "", budgetMan: "", region: "", industry: "" },
    parsed,
    true,
  );
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  const ai = buildAiRecommendInputFromFreetext(
    parsed,
    {
      ...draft,
      region: brief.region,
      goal: brief.goal,
      target: brief.target,
      industry: brief.industry,
      budgetMan: brief.budgetMan,
    },
    raw,
    true,
  );
  assert.ok(ai?.mediaIntents?.includes("bus_shelter"));

  const catalog = [
    {
      id: "s1",
      name: "가로변 버스쉘터 광고_목동사거리",
      type: "static",
      subCategory: "버스쉘터",
      regionMain: "seoul",
      region: "seoul",
      price: 5_000_000,
      availability: "available",
    },
    {
      id: "d1",
      name: "강남역 LED 전광판",
      type: "dooh",
      subCategory: "전광판",
      regionMain: "seoul",
      region: "seoul",
      price: 5_000_000,
      availability: "available",
    },
  ] as MediaItem[];

  const results = matchMediaCatalog(catalog, aiInputToMatching(ai, catalog));
  assert.match(results[0]!.media.name, /쉘터/);
  assert.equal(results[0]!.matchPrecision, "exact");
});
