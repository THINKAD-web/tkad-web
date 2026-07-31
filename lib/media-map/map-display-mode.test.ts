import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveMapDisplayMode,
  resolveServiceRegionLabel,
} from "./map-display-mode.ts";
import {
  mediaMatchesCoverageRegion,
  resolveRegionFilterSigunguCodes,
} from "./coverage-region-match.ts";

test("resolveMapDisplayMode — mobile is always service_region", () => {
  assert.equal(
    resolveMapDisplayMode({
      type: "mobile",
      lat: 37.5512,
      lng: 126.9882,
    }),
    "service_region",
  );
});

test("resolveMapDisplayMode — network without install coords", () => {
  assert.equal(
    resolveMapDisplayMode({
      type: "network",
      catalogSource: "network",
      lat: 37.5665,
      lng: 126.978,
    }),
    "service_region",
  );
});

test("resolveMapDisplayMode — network with install coords", () => {
  assert.equal(
    resolveMapDisplayMode({
      type: "network",
      catalogSource: "network",
      lat: 37.5665,
      lng: 126.978,
      installLocations: [{ label: "A", lat: 37.55, lng: 127.0, location: "x" }],
    }),
    "pin",
  );
});

test("resolveServiceRegionLabel — mobile coverage codes", () => {
  const label = resolveServiceRegionLabel({
    type: "mobile",
    coverageDistrictCodes: ["41111", "41113"],
  });
  assert.match(label ?? "", /경기/);
});

test("resolveRegionFilterSigunguCodes — gyeonggi main", () => {
  const filter = resolveRegionFilterSigunguCodes({ regionMain: "gyeonggi" });
  assert.equal(filter.kind, "codes");
  if (filter.kind === "codes") {
    assert.ok(filter.codes.has("41111"));
  }
});

test("mediaMatchesCoverageRegion — 경기 버스", () => {
  const filter = resolveRegionFilterSigunguCodes({ regionMain: "gyeonggi" });
  assert.equal(
    mediaMatchesCoverageRegion(
      {
        type: "mobile",
        coverageDistrictCodes: ["41111", "44131"],
      },
      filter,
    ),
    true,
  );
});

test("mediaMatchesCoverageRegion — non-overlapping region", () => {
  const filter = resolveRegionFilterSigunguCodes({ legacyRegion: "부산" });
  assert.equal(
    mediaMatchesCoverageRegion(
      {
        type: "mobile",
        coverageDistrictCodes: ["41111"],
      },
      filter,
    ),
    false,
  );
});
