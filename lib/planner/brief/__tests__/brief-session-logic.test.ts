import assert from "node:assert/strict";
import test from "node:test";
import { computeBriefFingerprint } from "../brief-fingerprint.ts";
import { EMPTY_BRIEF } from "../types.ts";
import type { BriefStoreState } from "../store.ts";
import {
  isStableSnapshot,
  selectChannelMode,
  selectMixIsStale,
  shouldPromptResumeSession,
  shouldPromptStaleMixBeforeStep,
  simulateResumePromptEffect,
} from "../brief-session-logic.ts";

function baseState(over: Partial<BriefStoreState> = {}): BriefStoreState {
  return {
    ...EMPTY_BRIEF,
    wizardStep: 1,
    channelMode: "ooh_only",
    digitalBudgetPct: 30,
    digitalChannelIds: ["naver", "kakao", "meta"],
    mixUnits: {},
    mixBriefFingerprint: null,
    setBudgetInputWon: () => {},
    setBudgetMode: () => {},
    setRegionCodes: () => {},
    toggleRegion: () => {},
    toggleGender: () => {},
    toggleAgeBand: () => {},
    setGoal: () => {},
    setIndustry: () => {},
    setFlight: () => {},
    setFreeText: () => {},
    applyFreeText: () => {},
    applyBriefPreset: () => {},
    setWizardStep: () => {},
    reset: () => {},
    setChannelMode: () => {},
    setDigitalBudgetPct: () => {},
    toggleDigitalChannel: () => {},
    setDigitalChannelIds: () => {},
    addMediaToMix: () => {},
    removeMediaFromMix: () => {},
    setMixUnits: () => {},
    replaceMix: () => {},
    clearMix: () => {},
    acknowledgeMixForCurrentBrief: () => {},
    ...over,
  };
}

// ── N-2: mix 없는 첫 진입 ──

test("resume prompt: mix 없으면 모달 없음", () => {
  assert.equal(
    shouldPromptResumeSession({
      hydrated: true,
      planFromUrl: null,
      alreadyPrompted: false,
      mixUnits: {},
    }),
    false,
  );
});

test("resume effect 시뮬: mix 없으면 setState 0회", () => {
  const r = simulateResumePromptEffect({
    hydrated: true,
    planFromUrl: null,
    alreadyPrompted: false,
    mixUnits: {},
  });
  assert.equal(r.openResume, false);
});

// ── N-2: mix 있는 재진입 ──

test("resume prompt: mix 있으면 1회만 true", () => {
  const params = {
    hydrated: true,
    planFromUrl: null as string | null,
    alreadyPrompted: false,
    mixUnits: { m1: 1, m2: 2 },
  };
  assert.equal(shouldPromptResumeSession(params), true);
  const second = simulateResumePromptEffect({
    ...params,
    alreadyPrompted: true,
  });
  assert.equal(second.openResume, false);
});

test("resume effect 시뮬: StrictMode 이중 호출 — 두 번째는 alreadyPrompted로 차단", () => {
  const first = simulateResumePromptEffect({
    hydrated: true,
    planFromUrl: null,
    alreadyPrompted: false,
    mixUnits: { m1: 1 },
  });
  assert.equal(first.openResume, true);
  assert.equal(first.alreadyPromptedAfter, true);

  const second = simulateResumePromptEffect({
    hydrated: true,
    planFromUrl: null,
    alreadyPrompted: first.alreadyPromptedAfter,
    mixUnits: { m1: 1 },
  });
  assert.equal(second.openResume, false);
});

// ── N-2: 브리프 변경 → stale 모달 ──

test("stale mix: 브리프 변경 시 Step 2 진입 전 확인", () => {
  const briefA = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  const fp = computeBriefFingerprint(briefA);
  const state = baseState({
    ...briefA,
    mixUnits: { m1: 1 },
    mixBriefFingerprint: fp,
    budgetInputWon: 50_000_000,
  });
  assert.equal(
    shouldPromptStaleMixBeforeStep({ targetStep: 2, state }),
    true,
  );
});

test("stale mix: 매체 유지(ack) 후 Step 2 진입 — stale 해소", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 50_000_000,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  const state = baseState({
    ...brief,
    mixUnits: { m1: 1 },
    mixBriefFingerprint: computeBriefFingerprint(brief),
  });
  assert.equal(
    shouldPromptStaleMixBeforeStep({ targetStep: 2, state }),
    false,
  );
});

test("stale mix: 매체 비우기 후 Step 2 — 확인 불필요", () => {
  const state = baseState({
    budgetInputWon: 50_000_000,
    mixUnits: {},
    mixBriefFingerprint: null,
  });
  assert.equal(
    shouldPromptStaleMixBeforeStep({ targetStep: 2, state }),
    false,
  );
});

// ── N-3: React 19 getSnapshot 안정성 ──

test("selectMixIsStale: 연속 getSnapshot 100회 Object.is 안정 (루프 방지)", () => {
  const state = baseState({
    budgetInputWon: 10_000_000,
    mixUnits: { m1: 1 },
    mixBriefFingerprint: null,
  });
  assert.equal(
    isStableSnapshot(() => selectMixIsStale(state), 100),
    true,
  );
});

test("anti-pattern: 객체 selector는 연속 호출 시 참조 불안정 (N-1 원인)", () => {
  const state = baseState({ budgetInputWon: 10_000_000 });
  const badSelector = () => ({
    budgetInputWon: state.budgetInputWon,
    budgetMode: state.budgetMode,
  });
  assert.equal(isStableSnapshot(badSelector, 10), false);
});

test("Q-1: selectChannelMode — 100회 getSnapshot Object.is 안정", () => {
  const state = baseState({ channelMode: "ooh_digital" });
  assert.equal(isStableSnapshot(() => selectChannelMode(state), 100), true);
  assert.equal(selectChannelMode(state), "ooh_digital");
});

test("plan URL 있으면 resume prompt 스킵", () => {
  assert.equal(
    shouldPromptResumeSession({
      hydrated: true,
      planFromUrl: "cm123",
      alreadyPrompted: false,
      mixUnits: { m1: 1 },
    }),
    false,
  );
});
