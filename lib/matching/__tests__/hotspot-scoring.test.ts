import assert from "node:assert/strict";
import { test } from "node:test";
import { computeHotspotBonus } from "@/lib/matching/hotspot-scoring";
import type { MediaItem } from "@/lib/media-data";
import type { RegionHotspot } from "@/lib/matching/region-hotspot";

function media(
  tags: MediaItem["hotspotTags"],
  name = "test",
): MediaItem {
  return {
    id: "m1",
    name,
    type: "dooh",
    price: 1_000_000,
    hotspotTags: tags,
  } as MediaItem;
}

const residentReq: RegionHotspot[] = [
  { regionId: "jeju", type: "residential", weight: 1 },
  { regionId: "jeju", type: "transit_corridor", weight: 1 },
];

test("hotspot: no requested → null", () => {
  const r = computeHotspotBonus(
    media([{ regionId: "jeju", type: "airport", weight: 1, zoneId: "jeju_airport" }]),
    undefined,
  );
  assert.equal(r, null);
});

test("hotspot: no media tags → null", () => {
  const r = computeHotspotBonus(media(undefined), residentReq);
  assert.equal(r, null);
});

test("hotspot: empty media tags → null", () => {
  const r = computeHotspotBonus(media([]), residentReq);
  assert.equal(r, null);
});

test("hotspot: non-jeju requested → null", () => {
  const r = computeHotspotBonus(
    media([{ regionId: "jeju", type: "commercial", weight: 1 }]),
    [{ regionId: "seoul", type: "commercial", weight: 1 }],
  );
  assert.equal(r, null);
});

test("hotspot: residential match positive, airport conflict negative", () => {
  const city = computeHotspotBonus(
    media([
      {
        regionId: "jeju",
        zoneId: "jeju_downtown",
        type: "residential",
        weight: 1,
      },
    ]),
    residentReq,
  );
  const airport = computeHotspotBonus(
    media([
      {
        regionId: "jeju",
        zoneId: "jeju_airport",
        type: "airport",
        weight: 1.2,
      },
      {
        regionId: "jeju",
        zoneId: "jeju_airport",
        type: "tourist",
        weight: 1,
      },
    ]),
    residentReq,
  );
  assert.ok(city);
  assert.ok(airport);
  assert.ok(city!.catalogPoints > 0, `city ${city!.catalogPoints}`);
  assert.ok(
    airport!.catalogPoints < city!.catalogPoints,
    `airport ${airport!.catalogPoints} vs city ${city!.catalogPoints}`,
  );
});

test("hotspot: catalogPoints clamped −10~+10", () => {
  const r = computeHotspotBonus(
    media(
      Array.from({ length: 5 }, () => ({
        regionId: "jeju" as const,
        zoneId: "jeju_downtown",
        type: "residential" as const,
        weight: 2,
      })),
    ),
    Array.from({ length: 5 }, () => ({
      regionId: "jeju" as const,
      type: "residential" as const,
      weight: 2,
    })),
  );
  assert.ok(r);
  assert.ok(r!.catalogPoints >= -10 && r!.catalogPoints <= 10);
});
