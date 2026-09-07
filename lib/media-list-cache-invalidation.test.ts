import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediaListCacheNeedsInvalidation } from "./media-list-cache-invalidation";

const base = {
  name: "강남역 LED",
  nameEn: "Gangnam LED",
  slug: "gangnam-led",
  type: "dooh",
  region: "seoul",
  district: "gangnam",
  location: "강남역",
  locationEn: "Gangnam Stn",
  price: 1_000_000,
  pricePeriod: "month",
  availability: "available",
  visibility: "public",
  status: "active",
  country: "KR",
  subCategory: "subway",
  regionSub: "gangnam",
  image: "https://example.com/a.jpg",
  isFeatured: false,
  isPopular: false,
  featuredOrder: null,
  popularOrder: null,
  popularityScore: 0,
  isVerified: true,
  networkId: null,
  mediaMainCategory: "digital",
  mediaSubCategory: "led",
  regionMain: "seoul",
  mediaCategory: ["digital", "led"] as string[],
} as const;

describe("mediaListCacheNeedsInvalidation", () => {
  it("returns false when list snapshot is unchanged", () => {
    assert.equal(mediaListCacheNeedsInvalidation({ ...base }, { ...base }), false);
  });

  it("returns true when list-visible fields change", () => {
    assert.equal(
      mediaListCacheNeedsInvalidation({ ...base }, { ...base, price: 2_000_000 }),
      true,
    );
    assert.equal(
      mediaListCacheNeedsInvalidation({ ...base }, { ...base, slug: "new-slug" }),
      true,
    );
  });

  it("returns true when browse taxonomy fields change", () => {
    assert.equal(
      mediaListCacheNeedsInvalidation(
        { ...base },
        { ...base, mediaMainCategory: "ooh" },
      ),
      true,
    );
    assert.equal(
      mediaListCacheNeedsInvalidation({ ...base }, { ...base, regionMain: "busan" }),
      true,
    );
    assert.equal(
      mediaListCacheNeedsInvalidation(
        { ...base },
        { ...base, mediaCategory: ["digital", "static"] },
      ),
      true,
    );
  });

  it("ignores mediaCategory reordering (content-equal arrays)", () => {
    assert.equal(
      mediaListCacheNeedsInvalidation(
        { ...base },
        { ...base, mediaCategory: ["led", "digital"] },
      ),
      false,
    );
  });
});
