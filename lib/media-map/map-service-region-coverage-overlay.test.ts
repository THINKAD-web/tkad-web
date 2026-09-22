import assert from "node:assert/strict";
import {
  MAP_COVERAGE_OVERLAY_MAX_DISTRICT_CODES,
  resolveMapCoverageOverlayState,
} from "@/lib/media-map/map-service-region-coverage-overlay";

const BUSAN_16 = [
  "26110",
  "26140",
  "26170",
  "26200",
  "26230",
  "26260",
  "26290",
  "26320",
  "26350",
  "26380",
  "26410",
  "26440",
  "26470",
  "26500",
  "26530",
  "26710",
];

const GWANGJU_5 = ["29110", "29140", "29155", "29170", "29200"];

assert.equal(
  resolveMapCoverageOverlayState([
    { type: "mobile", coverageDistrictCodes: BUSAN_16 },
  ])?.districtCount,
  16,
);

assert.equal(
  resolveMapCoverageOverlayState([
    { type: "mobile", coverageDistrictCodes: GWANGJU_5 },
  ])?.districtCount,
  5,
);

assert.equal(
  resolveMapCoverageOverlayState([
    { type: "dooh", mapDisplayMode: "pin", coverageDistrictCodes: BUSAN_16 },
  ]),
  null,
);

const many = Array.from({ length: MAP_COVERAGE_OVERLAY_MAX_DISTRICT_CODES + 1 }, (_, i) =>
  String(11000 + i).padStart(5, "0"),
);
assert.equal(
  resolveMapCoverageOverlayState([
    { type: "mobile", coverageDistrictCodes: many },
  ]),
  null,
);

console.log("map-service-region-coverage-overlay.test: ok");
