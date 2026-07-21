import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEDIA_CPM_MISMATCH_WARN_RATIO,
  MEDIA_DAILY_FOOTFALL_MAX,
  MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS,
  validateCsvDailyFootfall,
  validateMediaMetricsWrite,
} from "@/lib/media-metrics-write";

test("accepts null clears and in-range daily/impressions/cpm", () => {
  const r = validateMediaMetricsWrite({
    dailyFootfall: 150_000,
    impressions: 4_500_000,
    cpm: 12_000,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.values.dailyFootfall, 150_000);
  assert.equal(r.values.impressions, 4_500_000);
  assert.equal(r.values.cpm, 12_000);
});

test("rejects negative dailyFootfall", () => {
  const r = validateMediaMetricsWrite({ dailyFootfall: -1 });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]?.code, "negative");
});

test("rejects dailyFootfall above single-media cap", () => {
  const r = validateMediaMetricsWrite({
    dailyFootfall: MEDIA_DAILY_FOOTFALL_MAX + 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]?.code, "daily_footfall_cap");
});

test("rejects negative impressions", () => {
  const r = validateMediaMetricsWrite({ impressions: -10 });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]?.code, "negative");
});

test("warns when impressions exceed daily×31 but still ok", () => {
  const daily = 100_000;
  const impressions = daily * MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS + 1;
  const r = validateMediaMetricsWrite(
    { impressions, dailyFootfall: daily },
    {},
  );
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.warnings[0]?.code, "impressions_vs_daily");
  assert.equal(r.values.impressions, impressions);
});

test("no impressions warning when within daily×31", () => {
  const daily = 100_000;
  const r = validateMediaMetricsWrite({
    dailyFootfall: daily,
    impressions: daily * MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS,
  });
  assert.equal(r.ok, true);
  assert.equal(
    r.warnings.filter((w) => w.code === "impressions_vs_daily").length,
    0,
  );
});

test("warns on cpm 10× mismatch vs recalc, does not rewrite value", () => {
  const price = 30_000_000;
  const impressions = 1_000_000; // recalc CPM = 30_000
  const stored = 30_000 * MEDIA_CPM_MISMATCH_WARN_RATIO; // 300_000
  const r = validateMediaMetricsWrite(
    { cpm: stored, impressions },
    { price },
  );
  assert.equal(r.ok, true);
  assert.equal(r.values.cpm, stored);
  assert.equal(r.warnings.some((w) => w.code === "cpm_mismatch"), true);
});

test("no cpm warning when within 10× band", () => {
  const price = 30_000_000;
  const impressions = 1_000_000; // recalc 30_000
  const r = validateMediaMetricsWrite(
    { cpm: 45_000, impressions },
    { price },
  );
  assert.equal(r.ok, true);
  assert.equal(
    r.warnings.filter((w) => w.code === "cpm_mismatch").length,
    0,
  );
});

test("CSV exposure uses same dailyFootfall cap", () => {
  const bad = validateCsvDailyFootfall(MEDIA_DAILY_FOOTFALL_MAX + 1);
  assert.equal(bad.ok, false);
  const good = validateCsvDailyFootfall(80_000);
  assert.equal(good.ok, true);
  assert.equal(good.values.dailyFootfall, 80_000);
});

test("omitted fields are not present in values", () => {
  const r = validateMediaMetricsWrite({ dailyFootfall: 1 });
  assert.equal("impressions" in r.values, false);
  assert.equal("cpm" in r.values, false);
});
