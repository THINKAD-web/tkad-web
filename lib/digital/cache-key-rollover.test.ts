import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

/**
 * PR5-c commit 2/3 — cache key version rollover guard.
 * Ensures v1 keys are not reused after local-first catalog flip.
 */
test("digital catalog bridge uses v2 cache key (not v1)", () => {
  const src = readFileSync(
    resolve(process.cwd(), "lib/planner/digital-catalog-bridge.ts"),
    "utf8",
  );
  assert.match(src, /digital-catalog-bridge-integrated-v2/);
  assert.doesNotMatch(src, /digital-catalog-bridge-integrated"\]/);
  assert.doesNotMatch(src, /digital-catalog-bridge-integrated',/);
});

test("home landing digital tiles uses v2 cache key (not v1)", () => {
  const src = readFileSync(
    resolve(process.cwd(), "lib/home-landing-media-grid.ts"),
    "utf8",
  );
  assert.match(src, /home-landing-digital-tiles-v2/);
  assert.doesNotMatch(src, /home-landing-digital-tiles-v1/);
});

test("v1 and v2 cache keys are distinct strings", () => {
  const v1Bridge = "digital-catalog-bridge-integrated";
  const v2Bridge = "digital-catalog-bridge-integrated-v2";
  const v1Home = "home-landing-digital-tiles-v1";
  const v2Home = "home-landing-digital-tiles-v2";
  assert.notEqual(v1Bridge, v2Bridge);
  assert.notEqual(v1Home, v2Home);
});
