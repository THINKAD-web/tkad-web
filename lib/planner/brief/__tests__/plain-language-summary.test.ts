import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlainLanguageSummary,
  summarizeBriefTargetLine,
} from "@/lib/planner/brief/plain-language-summary";
import { formatReach } from "@/components/planner/brief/metrics-panel";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";

test("도달이 산정됐으면 노출·도달 두 숫자를 다 문장에 담는다", () => {
  const s = buildPlainLanguageSummary({
    isKo: true,
    budgetWon: 30_000_000,
    totalImpressions: 1_570_000,
    netReach: 124_000,
    formatCompact: formatReach,
  });
  assert.match(s, /3,000만원/);
  assert.match(s, /노출/);
  assert.match(s, /도달/);
  assert.match(s, /명/);
});

test("도달이 산정 중(null)이면 도달 인원을 지어내지 않는다", () => {
  const s = buildPlainLanguageSummary({
    isKo: true,
    budgetWon: 30_000_000,
    totalImpressions: 1_570_000,
    netReach: null,
    formatCompact: formatReach,
  });
  assert.match(s, /노출/);
  assert.doesNotMatch(s, /도달/);
  assert.doesNotMatch(s, /명/);
});

test("도달이 0이어도(계산 불가와 동일하게) 인원을 지어내지 않는다", () => {
  const s = buildPlainLanguageSummary({
    isKo: true,
    budgetWon: 30_000_000,
    totalImpressions: 1_570_000,
    netReach: 0,
    formatCompact: formatReach,
  });
  assert.doesNotMatch(s, /도달/);
});

test("영문 로케일 — 도달 산정됨", () => {
  const s = buildPlainLanguageSummary({
    isKo: false,
    budgetWon: 30_000_000,
    totalImpressions: 1_570_000,
    netReach: 124_000,
    formatCompact: formatReach,
  });
  assert.match(s, /₩30,000,000/);
  assert.match(s, /impressions/);
  assert.match(s, /reaching/);
});

test("타깃 요약 — 전부 기본값이면 전국·전 타깃", () => {
  const line = summarizeBriefTargetLine(EMPTY_BRIEF, true);
  assert.equal(line, "전국 · 전 타깃");
});

test("타깃 요약 — 지역·타깃이 있으면 압축해서 붙인다", () => {
  const line = summarizeBriefTargetLine(
    { ...EMPTY_BRIEF, regionCodes: ["11"], genders: ["female"], ageBands: ["20s", "30s"] },
    true,
  );
  assert.equal(line, "서울 · 여성 20s, 30s");
});

test("타깃 요약 — 지역만 기본값이 아니고 타깃은 기본값", () => {
  const line = summarizeBriefTargetLine(
    { ...EMPTY_BRIEF, regionCodes: ["11", "41"] },
    true,
  );
  assert.equal(line, "서울·경기 · 전 타깃");
});
