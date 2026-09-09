import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { oohLineFromCatalogItem } from "@/lib/admin-campaign-builder/ooh-types";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";

const sample: MediaCatalogListItem = {
  id: "media-cuid-1",
  slug: "gangnam-led",
  name: "강남 LED",
  nameEn: "Gangnam LED",
  type: "digital",
  location: "서울 강남구",
  locationEn: "Gangnam, Seoul",
  region: "서울",
  price: 30_000_000,
  lat: 37.49,
  lng: 127.03,
};

describe("oohLineFromCatalogItem", () => {
  it("maps catalog list item to ooh campaign line", () => {
    const line = oohLineFromCatalogItem(sample);
    assert.equal(line.mediaId, "media-cuid-1");
    assert.equal(line.slug, "gangnam-led");
    assert.equal(line.name, "강남 LED");
    assert.equal(line.location, "서울 강남구");
    assert.equal(line.region, "서울");
    assert.equal(line.type, "digital");
    assert.equal(line.priceWon, 30_000_000);
  });

  it("applies priceOverrideWon when provided", () => {
    const line = oohLineFromCatalogItem(sample, 25_000_000);
    assert.equal(line.priceWon, 25_000_000);
  });
});
