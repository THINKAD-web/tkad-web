import test from "node:test";
import assert from "node:assert/strict";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";
import {
  applyFreetextRecommendDraftDefaults,
} from "@/lib/recommend/freetext-recommend-defaults";
import {
  buildAiRecommendInputFromFreetext,
  type FreetextRecommendDraft,
} from "@/lib/recommend/build-freetext-recommend-input";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import { runRecommendMatchFromCatalog } from "@/lib/recommend/recommend-region-filter";
import {
  mediaMatchesPlannerBusWrapIntent,
  mediaMatchesPlannerSubwayIntent,
  mediaMatchesPlannerMobileIntent,
} from "@/lib/planner-logic";

function mockMedia(
  id: string,
  name: string,
  extra: Partial<MediaItem> = {},
): MediaItem {
  return {
    id,
    name,
    nameEn: name,
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    price: 300,
    location: name,
    ...extra,
  } as MediaItem;
}

const CATALOG: MediaItem[] = [
  mockMedia("sub1", "영등포구청역 지하철 5호선 CM보드 영상 광고", {
    mediaSubCategory: "subway",
    location: "영등포구청역",
  }),
  mockMedia("mall1", "스타필드 시티 운정점 E.V홀 스크린 광고", {
    region: "national",
    regionMain: "gyeonggi",
    location: "파주 운정",
  }),
  mockMedia("wrap1", "45인승 리무진 버스 래핑 광고", {
    type: "mobile",
    mediaSubCategory: "bus_wrap",
  }),
  mockMedia("led1", "강변 동서울터미널 LED 전광판 광고", {
    location: "동서울터미널",
  }),
  mockMedia("taxi1", "디지털 택시쉘터 광고 (강남 대치동)", {
    location: "강남 대치동",
  }),
  mockMedia("md1", "명동 중앙 빌보드 광고", {
    location: "명동",
    district: "중구",
  }),
  mockMedia("mg1", "마곡역 스마트쉘터 광고", {
    location: "마곡역 강서",
    district: "강서",
  }),
  mockMedia("busan1", "부산 해운대 임팩트웨이브 전광판", {
    region: "busan",
    regionMain: "busan",
    location: "해운대",
  }),
  mockMedia("ss1", "성수 호텔포코 빌보드", {
    location: "성수",
  }),
  mockMedia("b1", "경기 버스 외부 광고", {
    region: "national",
    regionMain: "gyeonggi",
    type: "mobile",
  }),
];

function inputFor(raw: string): AiRecommendInput {
  const parsed = parsePlannerFreetextBrief(raw);
  const empty: FreetextRecommendDraft = {
    goal: "",
    target: "",
    budgetMan: "",
    region: "",
    industry: "",
  };
  const { draft } = applyFreetextRecommendDraftDefaults(
    empty,
    parsed,
    true,
  );
  const input = buildAiRecommendInputFromFreetext(parsed, draft, raw, true);
  assert.ok(input, `failed to build input for ${raw}`);
  return input!;
}

test("integration: 지하철 intent ranks subway first", () => {
  const input = inputFor("지하철 IT 런칭 500만");
  const matching = aiInputToMatching(input, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    CATALOG,
    matching,
    5,
    input,
  );
  assert.equal(recommendations[0]?.media.id, "sub1");
  assert.ok(mediaMatchesPlannerSubwayIntent(recommendations[0]!.media));
});

test("integration: 버스 래핑 intent ranks wrap first", () => {
  const input = inputFor("버스 래핑 브랜딩 1000만");
  const matching = aiInputToMatching(input, 0);
  const pool = [
    mockMedia("wrap1", "45인승 리무진 버스 래핑 광고", {
      type: "mobile",
      mediaSubCategory: "bus_wrap",
    }),
    mockMedia("led1", "강변 동서울터미널 LED 전광판 광고", {
      location: "동서울터미널",
    }),
  ];
  const { recommendations } = runRecommendMatchFromCatalog(
    pool,
    matching,
    5,
    input,
  );
  assert.equal(recommendations[0]?.media.id, "wrap1");
  assert.ok(mediaMatchesPlannerBusWrapIntent(recommendations[0]!.media));
});

test("integration: 강남 택시 mobile intent", () => {
  const input = inputFor("강남 택시 브랜딩");
  const matching = aiInputToMatching(input, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    CATALOG,
    matching,
    5,
    input,
  );
  assert.ok(mediaMatchesPlannerMobileIntent(recommendations[0]!.media));
});

test("integration: 명동 zone avoids magok when pool has myeongdong", () => {
  const input = inputFor("명동 로컬 상권 300만원");
  const matching = aiInputToMatching(input, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    CATALOG,
    matching,
    5,
    input,
  );
  assert.equal(recommendations[0]?.media.id, "md1");
});

test("integration: 을지로 region label", () => {
  const parsed = parsePlannerFreetextBrief("을지로 F&B 매출 700만원");
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  assert.equal(brief.region, "을지로");
});
