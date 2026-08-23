import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  defaultPricingModeForBrowseSub,
  isQuoteOnlyMedia,
  mediaQuoteOnlyLabel,
  quoteOnlyGroupLabel,
} from "@/lib/media-pricing-mode";

function media(
  o: Partial<MediaItem> & Pick<MediaItem, "id">,
): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "static",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 10_000,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

test("isQuoteOnlyMedia — pricingMode 명시", () => {
  assert.equal(
    isQuoteOnlyMedia(media({ id: "a", pricingMode: "quote_only" })),
    true,
  );
  assert.equal(
    isQuoteOnlyMedia(media({ id: "b", pricingMode: "fixed", price: 0 })),
    false,
  );
});

test("isQuoteOnlyMedia — 레거시 폴백: 외벽+무단가", () => {
  assert.equal(
    isQuoteOnlyMedia(
      media({ id: "w", mediaSubCategory: "wall_mural", price: 0 }),
    ),
    true,
  );
  assert.equal(
    isQuoteOnlyMedia(
      media({
        id: "p",
        mediaSubCategory: "wall_mural",
        price: 5_000_000,
      }),
    ),
    false,
  );
});

test("defaultPricingModeForBrowseSub — 외벽은 quote_only", () => {
  assert.equal(defaultPricingModeForBrowseSub("wall_mural"), "quote_only");
  assert.equal(defaultPricingModeForBrowseSub("led"), "fixed");
});

test("quoteOnlyGroupLabel — 외벽만이면 외벽", () => {
  const wall = media({
    id: "w",
    pricingMode: "quote_only",
    mediaSubCategory: "wall_mural",
  });
  assert.equal(quoteOnlyGroupLabel([wall], true), "외벽");
  assert.equal(mediaQuoteOnlyLabel(true), "문의");
});
