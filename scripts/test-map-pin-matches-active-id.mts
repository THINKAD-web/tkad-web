/**
 * Unit tests for mapPinMatchesActiveId (list vs install pin IDs).
 * Run: npx tsx scripts/test-map-pin-matches-active-id.mts
 */
import assert from "node:assert/strict";
import { mapPinMatchesActiveId } from "../lib/media-detail-map-markers.ts";

const MEDIA_ID = "media_subway_cm_01";
const PIN_0 = `${MEDIA_ID}-install-0`;
const PIN_1 = `${MEDIA_ID}-install-1`;
const PIN_2 = `${MEDIA_ID}-install-2`;

// 목록 bare mediaId — 해당 매체의 모든 설치 핀 매칭
for (const pin of [PIN_0, PIN_1, PIN_2]) {
  assert.equal(
    mapPinMatchesActiveId(pin, MEDIA_ID),
    true,
    `list bare id should match ${pin}`,
  );
}

// 단일 좌표 매체 — 자기 자신만 매칭
assert.equal(mapPinMatchesActiveId(MEDIA_ID, MEDIA_ID), true);

// 핀 ID — 자기 핀만 매칭, 형제 핀은 제외
assert.equal(mapPinMatchesActiveId(PIN_0, PIN_0), true);
assert.equal(mapPinMatchesActiveId(PIN_1, PIN_1), true);
assert.equal(mapPinMatchesActiveId(PIN_0, PIN_1), false);
assert.equal(mapPinMatchesActiveId(PIN_1, PIN_0), false);
assert.equal(mapPinMatchesActiveId(PIN_2, PIN_0), false);

// null activeId — 항상 false
for (const pin of [MEDIA_ID, PIN_0, PIN_1]) {
  assert.equal(
    mapPinMatchesActiveId(pin, null),
    false,
    `null activeId should not match ${pin}`,
  );
}

// 다른 매체 — 불일치
assert.equal(mapPinMatchesActiveId(PIN_0, "other_media"), false);
assert.equal(mapPinMatchesActiveId("other_media", MEDIA_ID), false);

console.log("test-map-pin-matches-active-id: all assertions passed");
