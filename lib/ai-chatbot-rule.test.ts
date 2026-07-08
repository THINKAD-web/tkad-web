import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { completeRuleChatbot } from "@/lib/ai-chatbot-rule";

function baseItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-1",
    name: "Test",
    nameEn: "Test",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
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
    id: "nonhyeon-screen",
    name: "논현역 스크린도어",
    nameEn: "Nonhyeon Station Screen",
    type: "digital",
    location: "서울 강남 논현역",
    regionMain: "seoul",
    nearbyStations: "논현역",
    price: 900,
  }),
];

test("completeRuleChatbot: 강남 택시 브랜딩 — 0 token plan path", () => {
  const out = completeRuleChatbot({
    message: "강남 택시 브랜딩",
    catalog: FIXTURE_CATALOG,
    locale: "ko",
  });
  assert.equal(out.tokensUsed, 0);
  assert.equal(out.engine, "rule");
  assert.equal(out.model, "rule-based-v1");
  assert.match(out.reply, /이해했습니다/);
  assert.match(out.reply, /택시|버스|G버스/i);
  assert.ok(out.media.length >= 1);
  assert.ok(out.reply.includes("/contact"));
  assert.ok(out.plannerDeeplink?.startsWith("/planner?brief="));
});

test("completeRuleChatbot: 논현역 스크린 — search fallback", () => {
  const out = completeRuleChatbot({
    message: "논현역 스크린",
    catalog: FIXTURE_CATALOG,
    locale: "ko",
  });
  assert.equal(out.tokensUsed, 0);
  assert.ok(out.media.some((m) => m.id === "nonhyeon-screen"));
  assert.match(out.reply, /논현역 스크린도어|검색 결과/);
});

test("completeRuleChatbot: 애매한 발화 — clarification, no media", () => {
  const out = completeRuleChatbot({
    message: "광고 추천해줘",
    catalog: FIXTURE_CATALOG,
    locale: "ko",
  });
  assert.equal(out.tokensUsed, 0);
  assert.equal(out.media.length, 0);
  assert.match(out.reply, /지역|목표|예산/);
});

test("completeRuleChatbot: replies differ by input", () => {
  const a = completeRuleChatbot({
    message: "강남 택시 브랜딩",
    catalog: FIXTURE_CATALOG,
    locale: "ko",
  });
  const b = completeRuleChatbot({
    message: "논현역 스크린",
    catalog: FIXTURE_CATALOG,
    locale: "ko",
  });
  assert.notEqual(a.reply, b.reply);
});
