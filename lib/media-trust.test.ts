import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  computeTrustBadges,
  computeTrustScore,
  estimatePublicExecutionStats,
  type MediaExecutionStats,
  type MediaTrustBadgeContext,
} from "@/lib/media-trust";

const EMPTY_CTX: MediaTrustBadgeContext = {
  topInquiryIds: new Set(),
  hotWeekIds: new Set(),
};

const RAW_ZERO: MediaExecutionStats = {
  totalCount: 0,
  lastExecutionAt: null,
  monthsSinceLast: null,
};

function baseMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-media-zero-exec",
    name: "테스트 매체",
    location: "서울",
    region: "seoul",
    type: "dooh",
    price: 10_000_000,
    lat: 37.5,
    lng: 127.0,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as MediaItem;
}

test("DB 집행 0건 — verified_execution 배지 없음 (추정 집행 미반영)", () => {
  const estimated = estimatePublicExecutionStats("test-media-zero-exec", {
    region: "seoul",
    price: 10_000_000,
    visibilityScore: 80,
  });
  assert.ok(estimated.totalCount > 0, "fixture: estimate still non-zero");

  const badgesWithRaw = computeTrustBadges(
    baseMedia(),
    EMPTY_CTX,
    RAW_ZERO,
    0,
  );
  const badgesWithEstimate = computeTrustBadges(
    baseMedia(),
    EMPTY_CTX,
    estimated,
    0,
  );

  assert.ok(
    !badgesWithRaw.some((b) => b.id === "verified_execution"),
    "raw zero must not show verified_execution",
  );
  assert.ok(
    badgesWithEstimate.some((b) => b.id === "verified_execution"),
    "estimate path would incorrectly show badge (regression guard)",
  );
});

test("DB 집행 0건 — trustScore 집행 30% 항목 0 (추정과 분리)", () => {
  const estimated = estimatePublicExecutionStats("test-media-zero-exec");
  const scoreRaw = computeTrustScore(baseMedia(), RAW_ZERO, null);
  const scoreEstimated = computeTrustScore(baseMedia(), estimated, null);
  assert.ok(scoreEstimated > scoreRaw, "estimate inflates score vs raw zero");
  assert.ok(scoreRaw < 50, "zero execution should keep score moderate");
});

test("DB 집행 1건 이상 — verified_execution 배지 유지", () => {
  const raw: MediaExecutionStats = {
    totalCount: 3,
    lastExecutionAt: new Date(),
    monthsSinceLast: 1,
  };
  const badges = computeTrustBadges(baseMedia(), EMPTY_CTX, raw, 0);
  assert.ok(badges.some((b) => b.id === "verified_execution"));
});
