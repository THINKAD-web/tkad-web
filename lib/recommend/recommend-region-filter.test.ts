import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import {
  filterRecommendCatalogByRegions,
  resolveAiRecommendPlannerRegionIds,
  runRecommendMatchFromCatalog,
  shouldRetainNetworkMobileCandidates,
  isNonSpecificRegionCode,
  RECOMMEND_REGION_SUPPLEMENT_THRESHOLD,
} from "@/lib/recommend/recommend-region-filter";
import { resolveRecommendPortfolioFromPlanCart } from "@/lib/recommend/recommend-plan-cart";

function mockMedia(
  id: string,
  regionMain: string,
  location: string,
  regionSub?: string,
): MediaItem {
  return {
    id,
    name: location,
    nameEn: location,
    location,
    locationEn: location,
    region: regionMain,
    regionMain,
    regionSub,
    category: "static",
    type: "static",
    price: 100,
    monthlyImpressions: 10000,
    visibility: 80,
    popularity: 50,
    lat: 35.1,
    lng: 129.0,
  } as MediaItem;
}

test("resolveAiRecommendPlannerRegionIds: regionCodes busan", () => {
  const ids = resolveAiRecommendPlannerRegionIds({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  });
  assert.deepEqual(ids, ["busan"]);
});

test("resolveAiRecommendPlannerRegionIds: busanZones only", () => {
  const ids = resolveAiRecommendPlannerRegionIds({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "all",
    industry: "other",
    busanZones: ["centum"],
  });
  assert.deepEqual(ids, ["busan"]);
});

test("resolveAiRecommendPlannerRegionIds: free-text region only → no hard filter", () => {
  for (const region of ["전국", "서울", "강남", "Nationwide"]) {
    const ids = resolveAiRecommendPlannerRegionIds({
      goal: "awareness",
      target: "mass",
      budgetMaxMan: 1000,
      region,
      industry: "other",
    });
    assert.equal(ids, undefined, `region=${region}`);
  }
});

test("resolveAiRecommendPlannerRegionIds: national in regionCodes → no filter", () => {
  const ids = resolveAiRecommendPlannerRegionIds({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "national",
    industry: "other",
    regionCodes: ["national"],
  });
  assert.equal(ids, undefined);
});

test("isNonSpecificRegionCode: 전국/전체", () => {
  assert.equal(isNonSpecificRegionCode("전국"), true);
  assert.equal(isNonSpecificRegionCode("전체"), true);
  assert.equal(isNonSpecificRegionCode("seoul"), false);
});

test("shouldRetainNetworkMobileCandidates: bus wrap freetext", () => {
  assert.equal(
    shouldRetainNetworkMobileCandidates({
      goal: "awareness",
      target: "mass",
      budgetMaxMan: 1000,
      region: "all",
      industry: "other",
      plannerCategories: ["mobile"],
    }),
    true,
  );
  assert.equal(
    shouldRetainNetworkMobileCandidates({
      goal: "awareness",
      target: "mass",
      budgetMaxMan: 1000,
      region: "all",
      industry: "other",
      freetextSource: "강남 택시 브랜딩",
    }),
    true,
  );
});

test("runRecommendMatchFromCatalog: no region + mobile category scores nationwide", () => {
  const taxi = {
    ...mockMedia("taxi1", "seoul", "강남 택시 래핑"),
    type: "network",
    catalogSource: "network",
    name: "서울 택시 래핑",
  } as MediaItem;
  const led = mockMedia("led1", "seoul", "강남 LED 전광판");
  const catalog = [taxi, led];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 1000,
    region: "all",
    industry: "other",
    plannerCategories: ["mobile"],
    freetextSource: "버스 래핑 브랜딩 1000만",
  };
  const matching = aiInputToMatching(input, 0);
  const { recommendations, meta } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.equal(meta.regionSupplemented, false);
  assert.ok(
    recommendations.some((r) => /택시|taxi/i.test(r.media.name ?? "")),
    "mobile intent should prefer taxi over LED",
  );
});

test("runRecommendMatchFromCatalog: empty regional hard filter → no supplement banner", () => {
  const catalog = [mockMedia("b1", "busan", "해운대")];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 5000,
    region: "seoul",
    industry: "other",
    regionCodes: ["seoul"],
    seoulZones: ["gangnam"],
    plannerCategories: ["mobile"],
  };
  const matching = aiInputToMatching(input, 0);
  const { meta } = runRecommendMatchFromCatalog(catalog, matching, 5, input);
  assert.equal(meta.regionalCatalogCount, 0);
  assert.equal(meta.regionSupplemented, false);
});

test("filterRecommendCatalogByRegions: busanZones centum", () => {
  const catalog = [
    mockMedia("c1", "busan", "센텀시티", "busan_haeundae"),
    mockMedia("s1", "busan", "서면역", "busan_seomyeon"),
    mockMedia("x1", "seoul", "강남"),
  ];
  const filtered = filterRecommendCatalogByRegions(catalog, ["busan"], {
    busanZones: ["centum"],
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "c1");
});

test("runRecommendMatchFromCatalog: busan input excludes seoul when pool is sufficient", () => {
  const catalog = [
    mockMedia("b1", "busan", "해운대", "busan_haeundae"),
    mockMedia("b2", "busan", "서면", "busan_seomyeon"),
    mockMedia("b3", "busan", "센텀", "busan_haeundae"),
    mockMedia("b4", "busan", "남포", "busan_nampo"),
    mockMedia("b5", "busan", "부산역", "busan_downtown"),
    mockMedia("b6", "busan", "마린시티", "busan_haeundae"),
    mockMedia("s1", "seoul", "강남"),
    mockMedia("g1", "gyeonggi", "판교"),
  ];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 5000,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  };
  const matching = aiInputToMatching(input, 0);
  const { recommendations, meta } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.every((r) => r.media.regionMain === "busan"));
  assert.equal(meta.regionSupplemented, false);
  assert.ok(meta.regionalCatalogCount >= RECOMMEND_REGION_SUPPLEMENT_THRESHOLD);
});

test("runRecommendMatchFromCatalog: supplements nationwide when regional pool is small", () => {
  const catalog = [
    mockMedia("b1", "busan", "해운대", "busan_haeundae"),
    mockMedia("b2", "busan", "서면", "busan_seomyeon"),
    mockMedia("s1", "seoul", "강남"),
  ];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 5000,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  };
  const matching = aiInputToMatching(input, 0);
  const { recommendations, meta } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.ok(recommendations.length > 0);
  assert.equal(meta.regionSupplemented, true);
  assert.ok(recommendations.some((r) => r.media.regionMain !== "busan"));
});

test("integration: 버스 래핑 브랜딩 1000만 — no region hard filter, no banner", async () => {
  const { parsePlannerFreetextBrief } = await import(
    "@/lib/planner/parse-freetext-brief"
  );
  const { buildAiRecommendInputFromFreetextRaw } = await import(
    "@/lib/recommend/build-freetext-recommend-input"
  );
  const raw = "버스 래핑 브랜딩 1000만";
  const parseResult = parsePlannerFreetextBrief(raw);
  assert.deepEqual(parseResult.fields.categories.value, ["mobile"]);
  assert.equal(parseResult.fields.regions.value?.length ?? 0, 0);

  const input = buildAiRecommendInputFromFreetextRaw(raw, true);
  assert.ok(input);
  assert.equal(resolveAiRecommendPlannerRegionIds(input!), undefined);

  const bus = {
    ...mockMedia("bus1", "seoul", "서울 버스 래핑"),
    type: "network",
    catalogSource: "network",
    name: "서울 시내버스 래핑",
  } as MediaItem;
  const led = mockMedia("led1", "seoul", "강남 LED");
  const matching = aiInputToMatching(input!, 0);
  const { meta, recommendations } = runRecommendMatchFromCatalog(
    [bus, led],
    matching,
    5,
    input!,
  );
  assert.equal(meta.regionSupplemented, false);
  assert.ok(
    recommendations.some((r) => /버스|bus/i.test(r.media.name ?? "")),
  );
});

test("integration: 강남 택시 브랜딩 — mobile + gangnam region", async () => {
  const { parsePlannerFreetextBrief } = await import(
    "@/lib/planner/parse-freetext-brief"
  );
  const { buildAiRecommendInputFromFreetextRaw } = await import(
    "@/lib/recommend/build-freetext-recommend-input"
  );
  const raw = "강남 택시 브랜딩";
  const parseResult = parsePlannerFreetextBrief(raw);
  assert.deepEqual(parseResult.fields.categories.value, ["mobile"]);
  assert.ok(parseResult.fields.seoulZones.value?.includes("gangnam"));

  const input = buildAiRecommendInputFromFreetextRaw(raw, true);
  assert.ok(input?.plannerCategories?.includes("mobile"));
  assert.deepEqual(resolveAiRecommendPlannerRegionIds(input!), ["seoul"]);

  const taxi = {
    ...mockMedia("taxi1", "seoul", "강남 택시 광고"),
    type: "network",
    catalogSource: "network",
    name: "서울 택시 래핑",
  } as MediaItem;
  const delivery = {
    ...mockMedia("del1", "seoul", "강남 택배차량 LED"),
    type: "digital",
    name: "택배차량 LED",
  } as MediaItem;
  const matching = aiInputToMatching(input!, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    [taxi, delivery],
    matching,
    5,
    input!,
  );
  assert.ok(
    recommendations[0]?.media.id === "taxi1",
    `expected taxi first, got ${recommendations[0]?.media.name}`,
  );
});

test("integration: 부산 벡스코 — busan hard filter kept", async () => {
  const { parsePlannerFreetextBrief } = await import(
    "@/lib/planner/parse-freetext-brief"
  );
  const raw = "부산 벡스코 브랜딩 1000만";
  const parseResult = parsePlannerFreetextBrief(raw);
  assert.ok(parseResult.fields.regions.value?.includes("busan"));

  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 1000,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
    busanZones: parseResult.fields.busanZones.value ?? undefined,
  };
  assert.deepEqual(resolveAiRecommendPlannerRegionIds(input), ["busan"]);

  const catalog = [
    mockMedia("b1", "busan", "벡스코", "busan_haeundae"),
    mockMedia("b2", "busan", "센텀시티", "busan_haeundae"),
    mockMedia("b3", "busan", "마린시티", "busan_haeundae"),
    mockMedia("b4", "busan", "BEXCO 인근", "busan_haeundae"),
    mockMedia("b5", "busan", "센텀 GRP", "busan_haeundae"),
    mockMedia("b6", "busan", "시립미술관", "busan_haeundae"),
    mockMedia("s1", "seoul", "강남"),
  ];
  const matching = aiInputToMatching(input, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.ok(recommendations.every((r) => r.media.regionMain === "busan"));
});

test("integration: 전국 regionCodes — nationwide scoring", () => {
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 1000,
    region: "전국",
    industry: "other",
    regionCodes: ["national"],
  };
  assert.equal(resolveAiRecommendPlannerRegionIds(input), undefined);
  const catalog = [
    mockMedia("s1", "seoul", "강남"),
    mockMedia("b1", "busan", "해운대"),
  ];
  const matching = aiInputToMatching(input, 0);
  const { meta, recommendations } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.equal(meta.regionSupplemented, false);
  assert.ok(recommendations.length >= 2);
});

test("resolveRecommendPortfolioFromPlanCart: includes non-recommend cart items", () => {
  const catalog = [
    mockMedia("a", "busan", "A"),
    mockMedia("b", "seoul", "B"),
  ];
  const fullList = [{ item: catalog[0]!, score: 90, reasons: [] }];
  const portfolio = resolveRecommendPortfolioFromPlanCart(
    [
      {
        mediaId: "a",
        mediaName: "A",
        mediaType: "static",
        region: "busan",
        price: 100,
        addedFrom: "ai_recommend",
      },
      {
        mediaId: "b",
        mediaName: "B",
        mediaType: "static",
        region: "seoul",
        price: 100,
        addedFrom: "search",
      },
    ],
    fullList,
    catalog,
  );
  assert.deepEqual(
    portfolio.map((m) => m.id),
    ["a", "b"],
  );
});
