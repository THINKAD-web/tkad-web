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
    ...o,
  } as MediaItem;
}

const PRICED = media({ id: "priced", price: 3_000_000 });
const UNPRICED = media({ id: "unpriced", price: 0 });

test("portfolioHasUnpricedMedia — 0원 매체가 있으면 true", () => {
  assert.equal(portfolioHasUnpricedMedia([PRICED]), false);
  assert.equal(portfolioHasUnpricedMedia([PRICED, UNPRICED]), true);
});

test("buildUnpricedMediaNotice — 협의 단가 안내와 총액 제외 경고", () => {
  const notice = buildUnpricedMediaNotice({
    portfolio: [PRICED, UNPRICED],
    isKo: true,
  });
  assert.ok(notice);
  assert.match(notice!.text, /단가 협의/);
  assert.match(notice!.text, /포함되지 않을 수 있습니다/);
  assert.deepEqual(notice!.affectedMediaIds, ["unpriced"]);
});

test("buildUnpricedMediaNotice — 전부 미등록이면 구성 전체 문구", () => {
  const notice = buildUnpricedMediaNotice({
    portfolio: [UNPRICED],
    isKo: true,
  });
  assert.ok(notice);
  assert.match(notice!.text, /이 구성의 매체는/);
});
