import test from "node:test";
import assert from "node:assert/strict";
import {
  hasUniformPriceOptions,
  joinUniformPriceOptionLabels,
  uniformPriceOptionsSummary,
} from "@/lib/media-price-format";
import {
  trustGradeLabel,
  trustScoreToGrade,
} from "@/lib/media-trust";

test("hasUniformPriceOptions — 동일가 2개 이상", () => {
  assert.equal(
    hasUniformPriceOptions([
      { label: "20초", price: 50_000_000 },
      { label: "30초", price: 50_000_000 },
    ]),
    true,
  );
});

test("hasUniformPriceOptions — 가격 상이", () => {
  assert.equal(
    hasUniformPriceOptions([
      { label: "A", price: 10_000_000 },
      { label: "B", price: 12_000_000 },
    ]),
    false,
  );
});

test("hasUniformPriceOptions — 옵션 1개", () => {
  assert.equal(
    hasUniformPriceOptions([{ label: "A", price: 10_000_000 }]),
    false,
  );
});

test("uniformPriceOptionsSummary — 라벨 결합", () => {
  const summary = uniformPriceOptionsSummary([
    { label: "20초", price: 50_000_000 },
    { label: "30초", price: 50_000_000 },
  ]);
  assert.deepEqual(summary, {
    labelsJoined: "20초/30초",
    priceWon: 50_000_000,
  });
});

test("joinUniformPriceOptionLabels", () => {
  assert.equal(
    joinUniformPriceOptionLabels([
      { label: "20초", price: 1 },
      { label: "30초", price: 1 },
    ]),
    "20초/30초",
  );
});

test("trustScoreToGrade — 구간", () => {
  assert.equal(trustScoreToGrade(85), "excellent");
  assert.equal(trustScoreToGrade(70), "good");
  assert.equal(trustScoreToGrade(50), "average");
  assert.equal(trustScoreToGrade(39), "new");
});

test("trustGradeLabel — ko 신규", () => {
  assert.equal(trustGradeLabel("new", true), "신규");
});
