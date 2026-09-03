import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  MEDIA_CATALOG_LIST_ITEM_KEYS,
  catalogListItemToMediaItem,
  mediaItemToCatalogListItem,
} from "@/lib/media-catalog-list-dto";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";

function fixtureMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "cm_test_media",
    slug: "gangnam-led",
    name: "강남 LED",
    nameEn: "Gangnam LED",
    location: "서울특별시 강남구 테헤란로 123",
    locationEn: "123 Teheran-ro, Gangnam-gu, Seoul",
    region: "seoul",
    city: "서울",
    district: "강남구",
    type: "dooh",
    price: 500,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 12000,
    sampleImages: [
      "https://tkad-media.b-cdn.net/uploads/media/sample.jpg",
    ],
    description: "Long detail body that list UI never reads.",
    catalogDescription: "Also detail-only.",
    trafficPattern: { hourly: Array(24).fill(1) },
    installLocations: [{ label: "A", lat: 37.5, lng: 127.0 }],
    coverageDistrictCodes: ["11680"],
    priceOptions: [
      { label: "월 1회", price: 500, period: "month" },
      { label: "특수업종 가산", price: 100, period: "month", description: "가산금" },
    ],
    trustBadges: [{ id: "popular", labelKo: "인기", labelEn: "Popular", emoji: "🔥" }],
    averageRating: 4.5,
    reviewCount: 12,
    ...overrides,
  };
}

test("mediaItemToCatalogListItem keeps only list DTO keys", () => {
  const dto = mediaItemToCatalogListItem(fixtureMediaItem());
  const allowed = new Set<string>(MEDIA_CATALOG_LIST_ITEM_KEYS);
  for (const key of Object.keys(dto)) {
    assert.ok(allowed.has(key), `unexpected key: ${key}`);
  }
  assert.ok(dto.id);
  assert.ok(dto.name);
  assert.ok(dto.thumbnailUrl);
});

test("mediaItemToCatalogListItem drops detail-only fields", () => {
  const dto = mediaItemToCatalogListItem(fixtureMediaItem());
  assert.equal("description" in dto, false);
  assert.equal("sampleImages" in dto, false);
  assert.equal("trafficPattern" in dto, false);
  assert.equal("installLocations" in dto, false);
  assert.equal("coverageDistrictCodes" in dto, false);
});

test("mediaItemToCatalogListItem resolves CDN thumbnail", () => {
  const dto = mediaItemToCatalogListItem(fixtureMediaItem());
  assert.ok(dto.thumbnailUrl);
  const thumb = catalogThumbnailImageProps(dto.thumbnailUrl);
  assert.ok(thumb?.src);
  assert.equal(thumb.src, dto.thumbnailUrl);
});

test("mediaItemToCatalogListItem keeps browse filter taxonomy fields", () => {
  const dto = mediaItemToCatalogListItem(
    fixtureMediaItem({
      regionMain: "seoul",
      regionSub: "seoul_gangnam",
      mediaMainCategory: "ooh",
      mediaSubCategory: "billboard",
      mediaCategory: ["ooh", "billboard"],
      targetCategory: ["brand"],
      operatingHours: "24h",
    }),
  );
  assert.equal(dto.regionMain, "seoul");
  assert.equal(dto.regionSub, "seoul_gangnam");
  assert.equal(dto.mediaMainCategory, "ooh");
  assert.deepEqual(dto.mediaCategory, ["ooh", "billboard"]);
});

test("catalogListItemToMediaItem round-trips list-card fields", () => {
  const dto = mediaItemToCatalogListItem(fixtureMediaItem());
  const media = catalogListItemToMediaItem(dto);
  assert.equal(media.id, dto.id);
  assert.equal(media.name, dto.name);
  assert.deepEqual(media.sampleImages, [dto.thumbnailUrl]);
  assert.equal(media.priceOptions?.length, 2);
});

test("onlineSpec and catalogChannel survive list DTO round-trip", () => {
  const spec = {
    platform: "google",
    minBudget: 500_000,
    cpcMin: 100,
    cpcMax: 300,
    cpmMin: null,
    cpmMax: null,
  };
  const dto = mediaItemToCatalogListItem(
    fixtureMediaItem({
      catalogChannel: "online",
      type: "",
      price: 0,
      onlineSpec: spec,
    }),
  );
  assert.equal(dto.catalogChannel, "online");
  assert.deepEqual(dto.onlineSpec, spec);
  const media = catalogListItemToMediaItem(dto);
  assert.equal(media.catalogChannel, "online");
  assert.deepEqual(media.onlineSpec, spec);
});
