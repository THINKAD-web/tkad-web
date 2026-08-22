import assert from "node:assert/strict";
import test from "node:test";
import {
  computeBriefFingerprint,
  countMixUnits,
  isMixBriefStale,
} from "../brief-fingerprint.ts";
import { EMPTY_BRIEF } from "../types.ts";

test("computeBriefFingerprint: 핵심 필드만 반영", () => {
  const a = computeBriefFingerprint({
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    regionCodes: ["11", "41"],
    genders: ["female"],
    ageBands: ["20s", "30s"],
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
    goal: "awareness",
  });
  const b = computeBriefFingerprint({
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    regionCodes: ["41", "11"],
    genders: ["female"],
    ageBands: ["30s", "20s"],
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
    goal: "awareness",
  });
  assert.equal(a, b, "정렬 순서 무관 동일 지문");
});

test("업종 변경은 지문에 반영된다", () => {
  const base = computeBriefFingerprint({
    ...EMPTY_BRIEF,
    budgetInputWon: 10_000_000,
    flightStart: "2026-01-01",
    flightEnd: "2026-01-14",
    industry: null,
  });
  const withFb = computeBriefFingerprint({
    ...EMPTY_BRIEF,
    industry: "fb",
    budgetInputWon: 10_000_000,
    flightStart: "2026-01-01",
    flightEnd: "2026-01-14",
  });
  assert.notEqual(base, withFb);
  assert.equal(
    base,
    computeBriefFingerprint({
      ...EMPTY_BRIEF,
      freeText: "x",
      budgetInputWon: 10_000_000,
      flightStart: "2026-01-01",
      flightEnd: "2026-01-14",
      industry: null,
    }),
    "freeText 는 여전히 지문에 영향 없음",
  );
});

test("isMixBriefStale: mix 없으면 false", () => {
  assert.equal(
    isMixBriefStale({
      mixUnits: {},
      mixBriefFingerprint: "x",
      brief: EMPTY_BRIEF,
    }),
    false,
  );
});

test("isMixBriefStale: fingerprint 없고 mix 있으면 stale", () => {
  assert.equal(
    isMixBriefStale({
      mixUnits: { m1: 1 },
      mixBriefFingerprint: null,
      brief: EMPTY_BRIEF,
    }),
    true,
  );
});

test("isMixBriefStale: 브리프 변경 시 stale", () => {
  const briefA = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  const fp = computeBriefFingerprint(briefA);
  assert.equal(
    isMixBriefStale({
      mixUnits: { m1: 1 },
      mixBriefFingerprint: fp,
      brief: briefA,
    }),
    false,
  );
  assert.equal(
    isMixBriefStale({
      mixUnits: { m1: 1 },
      mixBriefFingerprint: fp,
      brief: { ...briefA, budgetInputWon: 50_000_000 },
    }),
    true,
  );
});

test("countMixUnits", () => {
  assert.equal(countMixUnits({ a: 1, b: 0, c: 2 }), 2);
});
