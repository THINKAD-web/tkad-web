import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMediaHeroSpecBadges } from "./media-detail-hero-specs.ts";

const baseMedia = {
  id: "m1",
  name: "Test",
  type: "dooh",
  size: "10 × 5 m",
  resolution: "1920×1080",
  brightness: "5,000 nits",
  targetAge: "20~30대",
  region: "seoul",
  price: 1000000,
} as Parameters<typeof buildMediaHeroSpecBadges>[0];

test("buildMediaHeroSpecBadges: digital prefers size, resolution, visibility", () => {
  const badges = buildMediaHeroSpecBadges(baseMedia, {
    isKo: true,
    visibilityScore: 88,
    labels: {
      size: "크기",
      resolution: "해상도",
      visibility: "가시성",
    },
  });
  assert.equal(badges.length, 3);
  assert.deepEqual(
    badges.map((b) => b.key),
    ["size", "resolution", "visibility"],
  );
});

test("buildMediaHeroSpecBadges: fills with brightness when no resolution", () => {
  const badges = buildMediaHeroSpecBadges(
    { ...baseMedia, type: "mobile", resolution: undefined },
    {
      isKo: true,
      visibilityScore: 70,
      labels: {
        size: "크기",
        resolution: "해상도",
        visibility: "가시성",
        brightness: "휘도",
      },
    },
  );
  assert.ok(badges.some((b) => b.key === "size"));
  assert.ok(badges.some((b) => b.key === "visibility"));
  assert.ok(badges.some((b) => b.key === "brightness"));
  assert.equal(badges.length, 3);
});
