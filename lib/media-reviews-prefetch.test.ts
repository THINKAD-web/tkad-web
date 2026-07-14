import assert from "node:assert/strict";
import test from "node:test";
import type { MediaReviewsInitialStats } from "@/lib/media-reviews";

/** SSR prefetch 시 초기 UI 상태 (컴포넌트와 동일 규칙) */
function deriveInitialUiState(initialStats?: MediaReviewsInitialStats) {
  const loadState = initialStats ? "ready" : "loading";
  const stats = initialStats?.stats ?? {
    averageRating: 0,
    reviewCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  const items: unknown[] = [];
  const showEmpty =
    loadState === "error" ||
    (loadState === "ready" && stats.reviewCount === 0 && items.length === 0);
  const itemsLoadState = initialStats
    ? initialStats.stats.reviewCount > 0
      ? "loading"
      : "idle"
    : "idle";
  return { loadState, showEmpty, itemsLoadState };
}

test("empty SSR stats skip section loading and show empty immediately", () => {
  const ui = deriveInitialUiState({
    stats: {
      averageRating: 0,
      reviewCount: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    canReview: false,
  });
  assert.equal(ui.loadState, "ready");
  assert.equal(ui.showEmpty, true);
  assert.equal(ui.itemsLoadState, "idle");
});

test("non-empty SSR stats show stats while items load", () => {
  const ui = deriveInitialUiState({
    stats: {
      averageRating: 4.5,
      reviewCount: 2,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    },
    canReview: false,
  });
  assert.equal(ui.loadState, "ready");
  assert.equal(ui.showEmpty, false);
  assert.equal(ui.itemsLoadState, "loading");
});

test("without initialStats keeps loading until client fetch", () => {
  const ui = deriveInitialUiState(undefined);
  assert.equal(ui.loadState, "loading");
  assert.equal(ui.showEmpty, false);
});
