/**
 * Unit tests for zoom-based pin name label overlay state.
 * Run: npx tsx scripts/test-map-pin-labels.mts
 */
import assert from "node:assert/strict";
import {
  MAP_PIN_NAME_LABEL_MAX_VISIBLE,
  MAP_PIN_NAME_LABEL_MIN_ZOOM,
  resolveMapPinLabelOverlayState,
} from "../lib/map-pin-labels.ts";

assert.equal(MAP_PIN_NAME_LABEL_MIN_ZOOM, 17);
assert.equal(MAP_PIN_NAME_LABEL_MAX_VISIBLE, 18);

const belowZoom = resolveMapPinLabelOverlayState(16.9, 10);
assert.equal(belowZoom.bulkLabelsEnabled, false);
assert.equal(belowZoom.capActive, false);

const atZoomUnderCap = resolveMapPinLabelOverlayState(17, 18);
assert.equal(atZoomUnderCap.bulkLabelsEnabled, true);
assert.equal(atZoomUnderCap.capActive, false);

const atZoomOverCap = resolveMapPinLabelOverlayState(17, 19);
assert.equal(atZoomOverCap.bulkLabelsEnabled, false);
assert.equal(atZoomOverCap.capActive, true);

const highZoomOverCap = resolveMapPinLabelOverlayState(18, 100);
assert.equal(highZoomOverCap.bulkLabelsEnabled, false);
assert.equal(highZoomOverCap.capActive, true);

console.log("test-map-pin-labels: ok");
