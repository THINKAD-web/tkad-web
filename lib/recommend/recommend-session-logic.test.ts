import assert from "node:assert/strict";
import test from "node:test";
import type { RecommendSessionSnapshot } from "@/lib/recommend/recommend-session-persist";
import {
  recommendResumeMediaCount,
  shouldPromptRecommendResumeSession,
} from "@/lib/recommend/recommend-session-logic";

const baseSnapshot: RecommendSessionSnapshot = {
  v: 2,
  phase: "dashboard",
  inputMode: "structured",
  lastPayload: {
    input: {
      budgetWon: 10_000_000,
      goal: "awareness",
      industry: "general",
      ageKeys: [],
      regionCodes: [],
    },
    regionCodes: [],
  },
  scored: [{ mediaId: "m1", score: 80, reasons: [{ ko: "a", en: "a" }] }],
  analysisSeed: 0,
  recommendQuantities: {},
  recommendPriceOptionIndex: {},
  savedAt: Date.now(),
};

test("recommend resume: empty cart and no session → no prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: null,
      planCartCount: 0,
    }),
    false,
  );
});

test("recommend resume: plan cart items → prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: null,
      planCartCount: 2,
    }),
    true,
  );
});

test("recommend resume: session snapshot with scored list → prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: baseSnapshot,
      planCartCount: 0,
    }),
    true,
  );
});

test("recommend resume: skipSessionRestore blocks prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: true,
      sessionSnapshot: baseSnapshot,
      planCartCount: 3,
    }),
    false,
  );
});

test("recommend resume media count prefers cart", () => {
  assert.equal(
    recommendResumeMediaCount({
      planCartCount: 3,
      sessionSnapshot: baseSnapshot,
    }),
    3,
  );
  assert.equal(
    recommendResumeMediaCount({
      planCartCount: 0,
      sessionSnapshot: baseSnapshot,
    }),
    1,
  );
});
