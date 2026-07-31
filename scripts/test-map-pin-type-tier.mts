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
  pinShapeForType,
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

assert.equal(pinShapeForType("digital"), "circle");
assert.equal(pinShapeForType("static"), "rounded-square");
assert.equal(pinShapeForType("network"), "diamond");

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
assert.match(svgDigital, /<circle cx="16"/, "digital circle shape");
assert.match(
  svgDigital,
  new RegExp(
    `stroke="${visibilityPinTierDefForScore(95, true).stroke.replace("#", "\\#")}"`,
  ),
  "tier stroke on outer ring",
);

const svgStatic = decodeSvg(staticHigh);
assert.match(svgStatic, />S</, "static letter");
assert.match(svgStatic, /fill="#334155"/, "static fill");
assert.match(svgStatic, /<rect x="5"/, "static rounded-square shape");

const svgNetwork = decodeSvg(networkHigh);
assert.match(svgNetwork, />N</, "network letter");
assert.match(svgNetwork, /fill="#1e4976"/, "network navy fill");
assert.match(svgNetwork, /points="16,5 27,16 16,27 5,16"/, "network diamond shape");

const selected = pinDataUrl("digital", true, true, 95);
assert.notEqual(selected, digitalHigh, "selected variant");
assert.match(decodeSvg(selected), /#ff6200/, "selection ring");

assert.ok(mapPinDataUrlCacheSize() >= 5, "cache populated");

console.log("test-map-pin-type-tier: ok");
