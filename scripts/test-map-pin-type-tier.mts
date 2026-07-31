/**
 * Unit tests for type + visibility tier composite map pins.
 * Run: npx tsx scripts/test-map-pin-type-tier.mts
 */
import assert from "node:assert/strict";
import {
  clearMapPinDataUrlCache,
  mapPinDataUrlCacheSize,
  pinDataUrl,
  pinLetterForType,
} from "../lib/map-pin-icon-data.ts";
import { visibilityPinTierDefForScore } from "../lib/map-pin-visibility-colors.ts";

function decodeSvg(dataUrl: string): string {
  assert.ok(dataUrl.startsWith("data:image/svg+xml;charset=UTF-8,"));
  return decodeURIComponent(
    dataUrl.slice("data:image/svg+xml;charset=UTF-8,".length),
  );
}

clearMapPinDataUrlCache();

assert.equal(pinLetterForType("digital"), "D");
assert.equal(pinLetterForType("static"), "S");
assert.equal(pinLetterForType("network"), "N");

const digitalHigh = pinDataUrl("digital", false, true, 95);
const digitalLow = pinDataUrl("digital", false, true, 50);
const staticHigh = pinDataUrl("static", false, true, 95);
const networkHigh = pinDataUrl("network", false, true, 95);

assert.notEqual(digitalHigh, digitalLow, "tier changes data url");
assert.notEqual(digitalHigh, staticHigh, "type changes data url");
assert.notEqual(staticHigh, networkHigh, "network vs static");

const svgDigital = decodeSvg(digitalHigh);
assert.match(svgDigital, />D</, "digital letter");
assert.match(svgDigital, /fill="#ff6200"/, "digital fill");
assert.match(
  svgDigital,
  new RegExp(
    `stroke="${visibilityPinTierDefForScore(95, true).stroke.replace("#", "\\#")}"`,
  ),
  "tier stroke on outer ring",
);

const svgStatic = decodeSvg(staticHigh);
assert.match(svgStatic, />S</, "static letter");
assert.match(svgStatic, /fill="#52525b"/, "static fill");

const svgNetwork = decodeSvg(networkHigh);
assert.match(svgNetwork, />N</, "network letter");

const selected = pinDataUrl("digital", true, true, 95);
assert.notEqual(selected, digitalHigh, "selected variant");
assert.match(decodeSvg(selected), /#ff6200/, "selection ring");

assert.ok(mapPinDataUrlCacheSize() >= 5, "cache populated");

console.log("test-map-pin-type-tier: ok");
