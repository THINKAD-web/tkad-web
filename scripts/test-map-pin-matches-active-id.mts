/**
 * Unit tests for map pin active-id matching and active-state delta sets.
 * Run: npx tsx scripts/test-map-pin-matches-active-id.mts
 */
import assert from "node:assert/strict";
import {
  affectedPinIdsForActiveStateChange,
  mapPinMatchesActiveId,
  pinsMatchingActiveId,
} from "../lib/media-detail-map-markers.ts";

const MEDIA_ID = "media_subway_cm_01";
const PIN_0 = `${MEDIA_ID}-install-0`;
const PIN_1 = `${MEDIA_ID}-install-1`;
const PIN_2 = `${MEDIA_ID}-install-2`;
const OTHER_PIN = "other_media";

const ALL_PINS = [PIN_0, PIN_1, PIN_2, OTHER_PIN];

// --- mapPinMatchesActiveId ---

for (const pin of [PIN_0, PIN_1, PIN_2]) {
  assert.equal(
    mapPinMatchesActiveId(pin, MEDIA_ID),
    true,
    `list bare id should match ${pin}`,
  );
}

assert.equal(mapPinMatchesActiveId(MEDIA_ID, MEDIA_ID), true);
assert.equal(mapPinMatchesActiveId(PIN_0, PIN_0), true);
assert.equal(mapPinMatchesActiveId(PIN_1, PIN_1), true);
assert.equal(mapPinMatchesActiveId(PIN_0, PIN_1), false);
assert.equal(mapPinMatchesActiveId(PIN_1, PIN_0), false);
assert.equal(mapPinMatchesActiveId(PIN_2, PIN_0), false);

for (const pin of [MEDIA_ID, PIN_0, PIN_1]) {
  assert.equal(
    mapPinMatchesActiveId(pin, null),
    false,
    `null activeId should not match ${pin}`,
  );
}

assert.equal(mapPinMatchesActiveId(PIN_0, OTHER_PIN), false);
assert.equal(mapPinMatchesActiveId(OTHER_PIN, MEDIA_ID), false);

// --- pinsMatchingActiveId ---

assert.deepEqual(
  [...pinsMatchingActiveId(ALL_PINS, MEDIA_ID)].sort(),
  [PIN_0, PIN_1, PIN_2].sort(),
);
assert.deepEqual([...pinsMatchingActiveId(ALL_PINS, PIN_1)], [PIN_1]);
assert.deepEqual([...pinsMatchingActiveId(ALL_PINS, null)], []);

// --- affectedPinIdsForActiveStateChange ---

// 선택 이동: 이전 핀(PIN_0)이 affected에 포함되어 선택 스타일이 꺼져야 함
{
  const prev = { selected: new Set([PIN_0]), hovered: new Set<string>() };
  const { affected, next } = affectedPinIdsForActiveStateChange(
    ALL_PINS,
    prev,
    PIN_1,
    null,
  );
  assert.ok(affected.has(PIN_0), "deselected pin must be in affected");
  assert.ok(affected.has(PIN_1), "newly selected pin must be in affected");
  assert.ok(!next.selected.has(PIN_0));
  assert.ok(next.selected.has(PIN_1));
}

// 선택 해제: 목록 bare id로 켜진 복수 핀이 모두 affected
{
  const prev = {
    selected: pinsMatchingActiveId(ALL_PINS, MEDIA_ID),
    hovered: new Set<string>(),
  };
  const { affected, next } = affectedPinIdsForActiveStateChange(
    ALL_PINS,
    prev,
    null,
    null,
  );
  for (const pin of [PIN_0, PIN_1, PIN_2]) {
    assert.ok(affected.has(pin), `cleared selection must affect ${pin}`);
  }
  assert.equal(next.selected.size, 0);
}

// 호버 이동: 이전 hover 핀이 affected에 포함
{
  const prev = { selected: new Set<string>(), hovered: new Set([PIN_0]) };
  const { affected } = affectedPinIdsForActiveStateChange(
    ALL_PINS,
    prev,
    null,
    PIN_1,
  );
  assert.ok(affected.has(PIN_0), "previous hover pin must be in affected");
  assert.ok(affected.has(PIN_1), "next hover pin must be in affected");
}

// 동일 상태 — affected는 현재 active 핀만 (중복 setIcon 허용, 누락 없음)
{
  const prev = { selected: new Set([PIN_0]), hovered: new Set([PIN_1]) };
  const { affected } = affectedPinIdsForActiveStateChange(
    ALL_PINS,
    prev,
    PIN_0,
    PIN_1,
  );
  assert.ok(affected.has(PIN_0));
  assert.ok(affected.has(PIN_1));
  assert.equal(affected.size, 2);
}

console.log("test-map-pin-matches-active-id: all assertions passed");
