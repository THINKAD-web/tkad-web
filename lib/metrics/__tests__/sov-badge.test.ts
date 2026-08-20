import assert from "node:assert/strict";
import test from "node:test";
import { needsSovBadge, sovBadgeLabel } from "../format";

test("V-3: loop 매체(DOOH·옥내 사이니지)에 SOV 배지가 붙는다", () => {
  assert.equal(
    needsSovBadge({ type: "digital", mediaSubCategory: "digital_signage" }),
    true,
  );
  assert.equal(needsSovBadge({ type: "digital", mediaSubCategory: "led_screen" }), true);
  assert.equal(needsSovBadge({ type: "digital", mediaSubCategory: "elevator" }), true);
  assert.equal(needsSovBadge({ type: "network", mediaSubCategory: "convenience_network" }), true);
});

test("V-3: 정적 매체는 SOV 개념이 없어 배지를 붙이지 않는다", () => {
  assert.equal(needsSovBadge({ type: "static", mediaSubCategory: "billboard" }), false);
  assert.equal(needsSovBadge({ type: "static", mediaSubCategory: "wall_mural" }), false);
  assert.equal(needsSovBadge({ type: "mobile", mediaSubCategory: "bus_exterior" }), false);
});

test("V-3: subCategory / mediaSubCategory 양쪽 필드명을 받는다", () => {
  assert.equal(needsSovBadge({ type: "digital", subCategory: "digital_signage" }), true);
  assert.equal(needsSovBadge({ type: "mobile", subCategory: "bus_exterior" }), false);
});

test("V-3: forceLoopSov override 매체는 SOV 배지 없음", () => {
  assert.equal(
    needsSovBadge({
      type: "digital",
      mediaSubCategory: "digital_signage",
      forceLoopSov: true,
    }),
    false,
  );
  assert.equal(
    needsSovBadge({
      type: "mobile",
      mediaSubCategory: "bus_exterior",
      forceLoopSov: true,
    }),
    false,
  );
});

test("V-3: 배지 문구에 5b 대기 상태가 드러난다", () => {
  assert.equal(sovBadgeLabel(), "SOV 미적용 · 5b 대기");
  assert.ok(sovBadgeLabel("en-US").includes("5b"));
});
