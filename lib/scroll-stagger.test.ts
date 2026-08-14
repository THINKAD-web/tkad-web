import assert from "node:assert/strict";
import test from "node:test";
import {
  SCROLL_STAGGER_MAX_MS,
  SCROLL_STAGGER_STEP_MS,
  staggerDelayMs,
} from "./scroll-stagger.ts";

test("B-1: 스태거 1스텝은 30ms", () => {
  assert.equal(SCROLL_STAGGER_STEP_MS, 30);
  assert.equal(staggerDelayMs(1), 30);
  assert.equal(staggerDelayMs(3), 90);
});

test("B-1: 첫 항목은 지연 없음", () => {
  assert.equal(staggerDelayMs(0), 0);
  assert.equal(staggerDelayMs(-1), 0);
});

test("B-1: 누적 300ms 상한을 넘지 않는다", () => {
  assert.equal(SCROLL_STAGGER_MAX_MS, 300);
  assert.equal(staggerDelayMs(10), 300);
  assert.equal(staggerDelayMs(11), 300);
  assert.equal(staggerDelayMs(100), 300);
  for (let i = 0; i < 200; i += 1) {
    assert.ok(staggerDelayMs(i) <= SCROLL_STAGGER_MAX_MS, `i=${i}`);
  }
});

test("B-1: 이전 값(80ms 스태거)보다 항상 작거나 같다", () => {
  for (let i = 0; i < 20; i += 1) {
    assert.ok(
      staggerDelayMs(i) <= i * 80,
      `i=${i}: ${staggerDelayMs(i)} > ${i * 80}`,
    );
  }
});

test("B-1: 단조 비감소", () => {
  for (let i = 1; i < 50; i += 1) {
    assert.ok(staggerDelayMs(i) >= staggerDelayMs(i - 1), `i=${i}`);
  }
});

test("B-1: 비정상 입력은 0", () => {
  assert.equal(staggerDelayMs(Number.NaN), 0);
  assert.equal(staggerDelayMs(Number.POSITIVE_INFINITY), 0);
});
