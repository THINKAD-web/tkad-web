/**
 * Chatbot card price must follow list/map SSOT (`resolveMediaDisplayPrice`),
 * not raw `m.price` when priceOptions differ.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "./media-data.ts";
import {
  chatbotCardPriceFieldsFromMedia,
  formatChatbotCardPrice,
} from "./ai-chatbot-media-adapter.ts";
import { executeChatbotTool } from "./ai-chatbot-tools.ts";
import {
  formatMediaDisplayPrice,
  resolveMediaDisplayPrice,
} from "./media-price-format.ts";
import { resolveMonthlyListPriceWon } from "./media-metrics.ts";

const rootHighOptionLow = {
  id: "opt-low",
  name: "옵션 최저가 매체",
  nameEn: "Option low",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  type: "dooh",
  price: 30_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "월 패키지", price: 3_000_000, period: "month" },
    { label: "루트", price: 30_000_000, period: "month" },
  ],
  lat: 37.5,
  lng: 127,
  dailyFootTraffic: 10_000,
} satisfies MediaItem;

const dayRateMedia = {
  id: "day-rate",
  name: "일 단가 매체",
  nameEn: "Day rate",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  type: "dooh",
  price: 22_000_000,
  pricePeriod: "day",
  lat: 37.5,
  lng: 127,
  dailyFootTraffic: 10_000,
} satisfies MediaItem;

const cheapMonthly = {
  id: "cheap",
  name: "저가 월",
  nameEn: "Cheap",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  type: "dooh",
  price: 3_000_000,
  pricePeriod: "month",
  lat: 37.5,
  lng: 127,
  dailyFootTraffic: 10_000,
} satisfies MediaItem;

const expensiveMonthly = {
  id: "expensive",
  name: "고가 월",
  nameEn: "Expensive",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  type: "dooh",
  price: 30_000_000,
  pricePeriod: "month",
  lat: 37.5,
  lng: 127,
  dailyFootTraffic: 500_000,
} satisfies MediaItem;

test("chatbotCardPriceFieldsFromMedia uses cheapest priceOptions", () => {
  const fields = chatbotCardPriceFieldsFromMedia(rootHighOptionLow);
  assert.equal(fields.priceMan, 300);
  assert.equal(fields.pricePeriod, "month");

  const listLabel = formatMediaDisplayPrice(rootHighOptionLow, "ko-KR");
  const cardLabel = formatChatbotCardPrice(
    {
      id: rootHighOptionLow.id,
      name: rootHighOptionLow.name,
      nameEn: rootHighOptionLow.nameEn,
      location: rootHighOptionLow.location,
      price: fields.priceMan,
      pricePeriod: fields.pricePeriod,
      type: rootHighOptionLow.type,
      region: rootHighOptionLow.region,
    },
    true,
  );
  assert.equal(cardLabel, listLabel);
  assert.equal(cardLabel, "₩300만/월");
});

test("formatChatbotCardPrice matches list for day-rate display period", () => {
  const fields = chatbotCardPriceFieldsFromMedia(dayRateMedia);
  assert.equal(fields.priceMan, 2200);
  assert.equal(fields.pricePeriod, "day");

  const cardLabel = formatChatbotCardPrice(
    {
      id: dayRateMedia.id,
      name: dayRateMedia.name,
      nameEn: dayRateMedia.nameEn,
      location: dayRateMedia.location,
      price: fields.priceMan,
      pricePeriod: fields.pricePeriod,
      type: dayRateMedia.type,
      region: dayRateMedia.region,
    },
    true,
  );
  assert.equal(cardLabel, formatMediaDisplayPrice(dayRateMedia, "ko-KR"));
  assert.equal(cardLabel, "₩2,200만/일");
});

test("getMediaByBudget filters on monthly list equivalent won", () => {
  const catalog: MediaItem[] = [cheapMonthly, expensiveMonthly, dayRateMedia];
  assert.ok(resolveMonthlyListPriceWon(dayRateMedia) / 10_000 > 500);

  const { result, cards } = executeChatbotTool(
    "getMediaByBudget",
    { maxPrice: 500, limit: 10 },
    catalog,
    "ko",
  );
  const budget = result as { totalMatches: number; items: { id: string }[] };
  assert.equal(budget.totalMatches, 1);
  assert.equal(budget.items[0]?.id, "cheap");
  assert.equal(cards[0]?.id, "cheap");
  assert.equal(cards[0]?.price, 300);
});

test("searchMedia compact uses display SSOT", () => {
  const { cards } = executeChatbotTool(
    "searchMedia",
    { query: "옵션", limit: 5 },
    [rootHighOptionLow],
    "ko",
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.price, 300);
  assert.equal(formatChatbotCardPrice(cards[0]!, true), "₩300만/월");
});
