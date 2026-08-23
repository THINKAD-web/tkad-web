import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  buildUnpricedMediaNotice,
  portfolioHasUnpricedMedia,
} from "@/lib/planner/unpriced-media-notice";

function media(
  o: Partial<MediaItem> & Pick<MediaItem, "id">,
): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "static",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 10_000,
    sampleImages: [],
    pricePeriod: "month",
    mediaSubCategory: "wall_mural",
    pricingMode: "quote_only",
    ...o,
  } as MediaItem;
}

const PRICED = media({ id: "priced", price: 3_000_000, pricingMode: "fixed" });
const QUOTE_ONLY = media({ id: "quote", price: 0 });

test("portfolioHasUnpricedMedia — 협의가 매체가 있으면 true", () => {
  assert.equal(portfolioHasUnpricedMedia([PRICED]), false);
  assert.equal(portfolioHasUnpricedMedia([PRICED, QUOTE_ONLY]), true);
});

test("buildUnpricedMediaNotice — 외벽 협의가 각주", () => {
  const notice = buildUnpricedMediaNotice({
    portfolio: [PRICED, QUOTE_ONLY],
    isKo: true,
  });
  assert.ok(notice);
  assert.match(notice!.text, /외벽 1건 별도 문의/);
  assert.match(notice!.text, /포함되지 않습니다/);
  assert.deepEqual(notice!.affectedMediaIds, ["quote"]);
});

test("buildUnpricedMediaNotice — 전부 협의가", () => {
  const notice = buildUnpricedMediaNotice({
    portfolio: [QUOTE_ONLY],
    isKo: true,
  });
  assert.ok(notice);
  assert.match(notice!.text, /외벽 1건 별도 문의/);
});
