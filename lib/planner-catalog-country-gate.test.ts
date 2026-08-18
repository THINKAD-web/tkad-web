import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Planner catalog gate is country=KR at DB query time — not regionMain.
 * See fetchPlannerMediaCatalog in public-media-catalog.ts
 */
test("fetchPlannerMediaCatalog WHERE uses country KR only (no regionMain)", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "public-media-catalog.ts"),
    "utf8",
  );
  const fn = src.slice(
    src.indexOf("export async function fetchPlannerMediaCatalog"),
    src.indexOf("export async function resolveMediaForDetail"),
  );
  assert.match(fn, /country:\s*"KR"/);
  assert.doesNotMatch(fn, /regionMain/);
});
