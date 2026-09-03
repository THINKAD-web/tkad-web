import assert from "node:assert/strict";
import test from "node:test";
import { compareMixCompositionToBaseline, slugJaccard } from "./mix-golden-compare.ts";

test("slugJaccard — identical sets", () => {
  assert.equal(slugJaccard(["a", "b"], ["a", "b"]), 1);
});

test("compareMixCompositionToBaseline — exact pass", () => {
  const snap = {
    channelCount: 6,
    slugs: ["a", "b", "c", "d", "e", "f"],
    budgetTotal: 5_000_000,
  };
  const r = compareMixCompositionToBaseline(snap, snap);
  assert.equal(r.verdict, "pass");
});

test("compareMixCompositionToBaseline — extreme collapse fail", () => {
  const r = compareMixCompositionToBaseline(
    { channelCount: 1, slugs: ["a"], budgetTotal: 4_000_000 },
    {
      channelCount: 5,
      slugs: ["a", "b", "c", "d", "e"],
      budgetTotal: 4_000_000,
    },
  );
  assert.equal(r.verdict, "fail");
  assert.ok(r.reasons.some((x) => x.includes("extreme collapse")));
});

test("compareMixCompositionToBaseline — below MIN fail", () => {
  const r = compareMixCompositionToBaseline(
    { channelCount: 2, slugs: ["a", "b"], budgetTotal: 1_000_000 },
    { channelCount: 6, slugs: ["a", "b", "c", "d", "e", "f"], budgetTotal: 1_000_000 },
  );
  assert.equal(r.verdict, "fail");
});
