import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterOohCatalog, uniqueOohRegions } from "@/lib/admin-campaign-builder/filter-ooh-catalog";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";

const sample: MediaCatalogListItem = {
  id: "abc",
  slug: "gangnam-led",
  name: "강남 LED",
  nameEn: "Gangnam LED",
  type: "digital",
  location: "서울 강남구",
  locationEn: "Gangnam, Seoul",
  region: "서울",
  price: 30_000_000,
  dailyFootTraffic: 450_000,
  cpm: 2200,
  lat: 37.49,
  lng: 127.03,
  isVerified: true,
};

describe("filterOohCatalog", () => {
  it("filters by type and region", () => {
    const items = [
      sample,
      { ...sample, id: "b", type: "static", region: "부산" },
    ];
    const filtered = filterOohCatalog(items, {
      type: "digital",
      region: "서울",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, "abc");
  });

  it("filters by price range and query", () => {
    const filtered = filterOohCatalog([sample], {
      q: "강남",
      minPrice: 10_000_000,
      maxPrice: 50_000_000,
    });
    assert.equal(filtered.length, 1);
  });
});

describe("uniqueOohRegions", () => {
  it("returns sorted unique regions", () => {
    const regions = uniqueOohRegions([
      sample,
      { ...sample, id: "b", region: "부산" },
      { ...sample, id: "c", region: "서울" },
    ]);
    assert.deepEqual(regions, ["부산", "서울"]);
  });
});
