import assert from "node:assert/strict";
import test from "node:test";
import type { RecommendSessionSnapshot } from "@/lib/recommend/recommend-session-persist";
import {
  countAiRecommendPlanCartItems,
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
      aiRecommendPlanCartCount: 0,
    }),
    false,
  );
});

test("recommend resume: AI plan cart items → prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: null,
      aiRecommendPlanCartCount: 2,
    }),
    true,
  );
});

test("recommend resume: non-AI plan cart only → no prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: null,
      aiRecommendPlanCartCount: 0,
    }),
    false,
  );
});

test("recommend resume: session snapshot with scored list → prompt", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: baseSnapshot,
      aiRecommendPlanCartCount: 0,
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
      aiRecommendPlanCartCount: 3,
    }),
    false,
  );
});

test("recommend resume: fresh start marker suppresses empty revisit", () => {
  assert.equal(
    shouldPromptRecommendResumeSession({
      alreadyPrompted: false,
      skipSessionRestore: false,
      sessionSnapshot: null,
      aiRecommendPlanCartCount: 0,
      resumeFreshStartAt: Date.now(),
    }),
    false,
  );
});

test("recommend resume media count prefers AI cart", () => {
  assert.equal(
    recommendResumeMediaCount({
      aiRecommendPlanCartCount: 3,
      sessionSnapshot: baseSnapshot,
    }),
    3,
  );
  assert.equal(
    recommendResumeMediaCount({
      aiRecommendPlanCartCount: 0,
      sessionSnapshot: baseSnapshot,
    }),
    1,
  );
});

test("countAiRecommendPlanCartItems filters addedFrom", () => {
  assert.equal(
    countAiRecommendPlanCartItems({
      items: [
        {
          mediaId: "a",
          mediaName: "A",
          mediaType: "ooh",
          catalogChannel: "ooh",
          region: "",
          price: 0,
          addedFrom: "ai_recommend",
          addedAt: 1,
          lineTotalWon: 1,
        },
        {
          mediaId: "b",
          mediaName: "B",
          mediaType: "ooh",
          catalogChannel: "ooh",
          region: "",
          price: 0,
          addedFrom: "search",
          addedAt: 2,
          lineTotalWon: 1,
        },
      ],
    }),
    1,
  );
});
