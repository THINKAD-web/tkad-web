import assert from "node:assert/strict";
import test from "node:test";
import { buildMediaMix } from "./mix-engine.ts";
import { compareMixCompositionToBaseline } from "./mix-golden-compare.ts";
import {
  loadMixGoldenBaseline,
  loadMixGoldenCatalogFromSeed,
  MIX_GOLDEN_SCENARIOS,
} from "./mix-golden-fixture.ts";
import { MIX_ENGINE_MIN_CHANNELS } from "./mix-types.ts";

const FIXED_AT = { generatedAt: "2026-09-03T00:00:00.000Z" };
const catalog = loadMixGoldenCatalogFromSeed();
const baselineById = new Map(loadMixGoldenBaseline().map((b) => [b.id, b]));

test("mix golden — ported engine vs dmpilot baseline (6 scenarios)", () => {
  const failures: string[] = [];
  const warns: string[] = [];

  for (const scenario of MIX_GOLDEN_SCENARIOS) {
    const baseline = baselineById.get(scenario.id);
    assert.ok(baseline, `missing baseline for ${scenario.id}`);

    const result = buildMediaMix(catalog, scenario.input, FIXED_AT);
    const actual = {
      channelCount: result.channels.length,
      slugs: result.channels.map((c) => c.media.slug).sort(),
      budgetTotal: result.channels.reduce((s, c) => s + c.budgetWon, 0),
    };

    const verdict = compareMixCompositionToBaseline(actual, baseline);
    if (verdict.verdict === "fail") {
      failures.push(
        `${scenario.id}: ${verdict.reasons.join("; ")} | actual=${actual.slugs.join(",")} baseline=${baseline.slugs.join(",")}`,
      );
    } else if (verdict.verdict === "warn") {
      warns.push(`${scenario.id}: ${verdict.reasons.join("; ")}`);
    }

    assert.ok(
      actual.channelCount >= MIX_ENGINE_MIN_CHANNELS,
      `${scenario.id} channel count ${actual.channelCount}`,
    );
    assert.equal(
      actual.budgetTotal,
      scenario.input.budgetMonthly,
      `${scenario.id} budget total`,
    );
  }

  if (warns.length) {
    console.warn("[mix-golden] warnings:", warns);
  }
  assert.equal(
    failures.length,
    0,
    `golden FAIL:\n${failures.join("\n")}`,
  );
});

test("mix engine — deterministic slug/budget output", () => {
  const input = MIX_GOLDEN_SCENARIOS[0]!.input;
  const a = buildMediaMix(catalog, input, FIXED_AT);
  const b = buildMediaMix(catalog, input, FIXED_AT);
  assert.deepEqual(
    a.channels.map((c) => c.media.slug),
    b.channels.map((c) => c.media.slug),
  );
  assert.deepEqual(
    a.channels.map((c) => c.budgetWon),
    b.channels.map((c) => c.budgetWon),
  );
});
