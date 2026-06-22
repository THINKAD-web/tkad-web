/**
 * SEO PR1 — keyword-first title/H1/meta copy smoke tests.
 * Run: npx tsx scripts/test-seo-pr1-meta.mts
 */
import assert from "node:assert/strict";
import { siteTitleTemplate } from "../lib/seo.ts";
import {
  tier1CategoryHeroTitle,
  tier1CategoryLandingTitle,
} from "../lib/seo-landing-copy.ts";
import {
  categoryHeroTitle,
  categoryLandingTitle,
} from "../lib/media-category-landing.ts";
import {
  marketingTypeHeroTitle,
  marketingTypeLandingTitle,
} from "../lib/marketing-media-types.ts";
import {
  localLandingHeroTitle,
  localLandingTitle,
  LOCAL_SEO_LANDINGS,
} from "../lib/local-seo-landings.ts";
import { buildMediaOgTitle } from "../lib/media-og-metadata.ts";
import type { MediaItem } from "../lib/media-data.ts";

assert.equal(siteTitleTemplate("ko"), "%s | THINKAD");

const koBillboardTitle = tier1CategoryLandingTitle("billboard", "ko", 12);
assert.match(koBillboardTitle!, /전광판 광고 단가/);
assert.match(koBillboardTitle!, /12개/);
assert.match(koBillboardTitle!, /THINKAD/);

const koBillboardZero = tier1CategoryLandingTitle("billboard", "ko", 0);
assert.match(koBillboardZero!, /전광판 광고 단가/);
assert.doesNotMatch(koBillboardZero!, /0개/);

assert.match(
  categoryLandingTitle("subway", "ko", 8),
  /지하철 광고 비용/,
);
assert.match(categoryHeroTitle("bus", "ko", 5), /버스 광고 단가/);

assert.match(
  marketingTypeLandingTitle("billboard", "ko", 3)!,
  /전광판 광고 단가/,
);
assert.match(
  marketingTypeHeroTitle("dooh", "en", 0)!,
  /DOOH/i,
);

const landing = LOCAL_SEO_LANDINGS[0]!;
assert.match(localLandingTitle(landing, "ko", 7), /전광판·OOH 광고비/);
assert.match(localLandingHeroTitle(landing, "ko", 7), /전광판·OOH 광고비/);
assert.doesNotMatch(localLandingHeroTitle(landing, "ko", 0), /0개/);

const media = {
  id: "test-1",
  name: "강남역 미디어폴",
  nameEn: "Gangnam Media Pole",
  location: "서울 강남구 강남대로",
  locationEn: "Gangnam-daero, Gangnam-gu",
  district: "강남구",
  city: "서울",
  region: "seoul",
  type: "digital",
  mediaCategory: ["media_pole"],
  price: 5_000_000,
  dailyFootTraffic: 10000,
} as MediaItem;

const mediaTitle = buildMediaOgTitle(media, "ko");
assert.match(mediaTitle, /강남역 미디어폴/);
assert.match(mediaTitle, /강남구/);
assert.match(mediaTitle, /월 500만원/);
assert.match(mediaTitle, /옥외광고/);
assert.doesNotMatch(mediaTitle, /THINKAD 싱커드/);

const mediaNoPrice = buildMediaOgTitle({ ...media, price: 0 }, "ko");
assert.doesNotMatch(mediaNoPrice, /월 0만원/);
assert.match(mediaNoPrice, /옥외광고/);

console.log("test-seo-pr1-meta: all assertions passed");
