import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { executePlanFromBrief } from "@/lib/ai-chatbot-plan-from-brief";
import { executeChatbotTool } from "@/lib/ai-chatbot-tools";

function baseItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-1",
    name: "Test",
    nameEn: "Test",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    price: 2_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 50_000,
    ...overrides,
  };
}

const FIXTURE_CATALOG: MediaItem[] = [
  baseItem({
    id: "taxi-1",
    name: "서울 택시 래핑 A",
    nameEn: "Seoul Taxi Wrap A",
    type: "mobile",
    location: "서울 강남",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    price: 1_800,
    dailyFootTraffic: 120_000,
  }),
  baseItem({
    id: "bus-1",
    name: "G버스 래핑",
    nameEn: "G Bus Wrap",
    type: "mobile",
    location: "서울 강남·서초",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    price: 2_500,
    dailyFootTraffic: 200_000,
  }),
  baseItem({
    id: "bb-gangnam",
    name: "강남 빌보드",
    nameEn: "Gangnam Billboard",
    type: "static",
    location: "서울 강남",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    price: 4_000,
  }),
  baseItem({
    id: "gg-mobile",
    name: "경기 버스 패키지",
    nameEn: "Gyeonggi Bus Package",
    type: "mobile",
    location: "경기 수원",
    region: "gyeonggi",
    regionMain: "gyeonggi",
    price: 1_200,
    dailyFootTraffic: 80_000,
  }),
  baseItem({
    id: "nonhyeon-screen",
    name: "논현역 스크린도어",
    nameEn: "Nonhyeon Station Screen",
    type: "dooh",
    location: "서울 강남 논현역",
    regionMain: "seoul",
    nearbyStations: "논현역",
    price: 900,
  }),
];

test("planFromBrief: 강남 택시 브랜딩 3000만 → mobile·gangnam·brand", () => {
  const out = executePlanFromBrief(
    "강남 택시 브랜딩 3000만",
    FIXTURE_CATALOG,
    "ko",
  );
  assert.ok(!("error" in out));
  if ("error" in out) return;

  assert.equal(out.parsed.categories?.join(","), "mobile");
  assert.ok(out.parsed.seoulZones?.includes("gangnam"));
  assert.equal(out.parsed.campaignGoal, "brand");
  assert.equal(out.parsed.budgetMan, 3000);
  assert.ok(out.parseSummary.includes("이해했습니다"));
  assert.ok(out.items.length > 0);
  assert.ok(out.items.every((i) => i.type === "mobile" || i.type === "network"));
  assert.ok(out.items[0]!.reasonLabels.length >= 1);
  assert.ok(out.plannerDeeplink?.startsWith("/planner?brief="));
  assert.ok(out.recommendDeeplink?.startsWith("/recommend?brief="));
  const names = out.items.map((i) => i.name).join(" ");
  assert.match(names, /택시|버스|G버스/i);
});

test("planFromBrief: 경기 30대 이동형 → gyeonggi·age30s·mobile", () => {
  const out = executePlanFromBrief("경기 30대 이동형", FIXTURE_CATALOG, "ko");
  assert.ok(!("error" in out));
  if ("error" in out) return;

  assert.equal(out.parsed.categories?.join(","), "mobile");
  assert.ok(out.parsed.regions?.includes("gyeonggi"));
  assert.ok(out.parsed.ageKeys?.includes("age30s"));
  assert.ok(out.items.length > 0);
  assert.ok(out.items.every((i) => i.type === "mobile"));
  assert.ok(out.items.some((i) => i.id === "gg-mobile"));
});

test("planFromBrief: 애매한 발화 → needsClarification, 추측 없음", () => {
  const out = executePlanFromBrief("광고 추천해줘", FIXTURE_CATALOG, "ko");
  assert.ok(!("error" in out));
  if ("error" in out) return;

  assert.equal(out.parsedFieldCount, 0);
  assert.equal(out.needsClarification, true);
  assert.ok(out.clarificationHint);
});

test("executeChatbotTool: planFromBrief returns cards without reason fields", () => {
  const { result, cards } = executeChatbotTool(
    "planFromBrief",
    { brief: "강남 택시 브랜딩 3000만", limit: 4 },
    FIXTURE_CATALOG,
    "ko",
  );
  const r = result as {
    parseSummary: string;
    items: Array<{ reasonLabels?: string[] }>;
  };
  assert.ok(r.parseSummary);
  assert.ok(r.items[0]?.reasonLabels?.length);
  assert.ok(cards.length > 0);
  assert.equal("reasonLabels" in cards[0]!, false);
});

test("searchMedia: 논현역 스크린 still works for station lookup", () => {
  const { result } = executeChatbotTool(
    "searchMedia",
    { query: "논현역 스크린", limit: 5 },
    FIXTURE_CATALOG,
    "ko",
  );
  const r = result as { totalMatches: number; items: Array<{ id: string }> };
  assert.ok(r.totalMatches >= 1);
  assert.equal(r.items[0]?.id, "nonhyeon-screen");
});

test("planFromBrief beats searchMedia for 택시 brief", () => {
  const search = executeChatbotTool(
    "searchMedia",
    { query: "택시", limit: 10 },
    FIXTURE_CATALOG,
    "ko",
  );
  const plan = executeChatbotTool(
    "planFromBrief",
    { brief: "강남 택시 브랜딩 3000만" },
    FIXTURE_CATALOG,
    "ko",
  );
  const searchR = search.result as { totalMatches: number };
  const planR = plan.result as { items: Array<{ id: string }> };
  assert.equal(searchR.totalMatches, 1);
  assert.ok(planR.items.length >= 2);
});
