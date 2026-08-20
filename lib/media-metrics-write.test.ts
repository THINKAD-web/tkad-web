import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEDIA_CPM_MISMATCH_ERROR_RATIO,
  MEDIA_CPM_MISMATCH_WARN_RATIO,
  MEDIA_DAILY_FOOTFALL_MAX,
  MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS,
  MEDIA_MONTHLY_IMPRESSIONS_CAP,
  gateMediaMetricsWrite,
  validateCsvDailyFootfall,
  validateMappedMediaMetrics,
  validateMediaMetricsWrite,
  validateNetworkAggregateFootfall,
  validateNetworkLocationFootfall,
} from "@/lib/media-metrics-write";
import { NETWORK_DAILY_FOOTFALL_CAP } from "@/lib/media-network-footfall";

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
    { type: "static" },
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

test("errors on cpm ≥10× mismatch vs recalc", () => {
  const price = 30_000_000;
  const impressions = 1_000_000; // recalc CPM = 30_000
  const stored = 30_000 * MEDIA_CPM_MISMATCH_ERROR_RATIO;
  const r = validateMediaMetricsWrite(
    { cpm: stored, impressions },
    { price },
  );
  assert.equal(r.ok, false);
  assert.equal(r.values.cpm, stored);
  assert.equal(r.errors.some((e) => e.code === "cpm_mismatch"), true);
});

test("warns on cpm ≥3× mismatch vs recalc, does not rewrite value", () => {
  const price = 30_000_000;
  const impressions = 1_000_000; // recalc 30_000
  const stored = 30_000 * MEDIA_CPM_MISMATCH_WARN_RATIO;
  const r = validateMediaMetricsWrite(
    { cpm: stored, impressions },
    { price },
  );
  assert.equal(r.ok, true);
  assert.equal(r.values.cpm, stored);
  assert.equal(r.warnings.some((w) => w.code === "cpm_mismatch"), true);
});

test("no cpm warning when within 3× band", () => {
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

test("EE placeholder ₩3 vs recalc ₩2,679 → error + placeholder warn", () => {
  const r = validateMediaMetricsWrite(
    { cpm: 3, impressions: 11_198_208 },
    { price: 30_000_000 },
  );
  assert.equal(r.ok, false);
  assert.equal(r.errors.some((e) => e.code === "cpm_mismatch"), true);
  assert.equal(r.warnings.some((w) => w.code === "cpm_placeholder"), true);
});

test("placeholder warn when ₩5 vs modest recalc under 10×", () => {
  const r = validateMediaMetricsWrite(
    { cpm: 5, impressions: 1_000_000 },
    { price: 12_000 },
  );
  assert.equal(r.ok, true);
  assert.equal(r.warnings.some((w) => w.code === "cpm_placeholder"), true);
  assert.equal(r.errors.length, 0);
});

test("G버스-style 64M impressions on bus class is hard-rejected", () => {
  const r = validateMediaMetricsWrite(
    { impressions: 64_000_000, dailyFootfall: 1_500_000 },
    { name: "경기 G버스 TV", type: "mobile", subCategory: "bus_interior" },
  );
  assert.equal(r.ok, false);
  assert.equal(r.errors.some((e) => e.code === "impressions_class_cap"), true);
  assert.equal(
    r.errors.find((e) => e.code === "impressions_class_cap")?.details?.cap,
    MEDIA_MONTHLY_IMPRESSIONS_CAP.bus_exterior,
  );
});

test("bus_exterior impressions at 2M cap is accepted", () => {
  const r = validateMediaMetricsWrite(
    { impressions: MEDIA_MONTHLY_IMPRESSIONS_CAP.bus_exterior },
    { name: "시내버스 래핑 1대", type: "mobile", subCategory: "bus_exterior" },
  );
  assert.equal(r.ok, true);
});

test("Package keyword + 18.5M impressions warns (dooh under 20M cap)", () => {
  const r = validateMediaMetricsWrite(
    { impressions: 18_500_000 },
    {
      name: "잠실 롯데월드몰 Full Package",
      type: "digital",
      subCategory: "led_screen",
      widthM: 20,
      heightM: 10,
    },
  );
  assert.equal(r.ok, true);
  assert.equal(
    r.warnings.some((w) => w.code === "package_network_scale"),
    true,
  );
});

test("CSV exposure uses same dailyFootfall cap", () => {
  const bad = validateCsvDailyFootfall(MEDIA_DAILY_FOOTFALL_MAX + 1);
  assert.equal(bad.ok, false);
  const good = validateCsvDailyFootfall(80_000);
  assert.equal(good.ok, true);
  assert.equal(good.values.dailyFootfall, 80_000);
});

test("CSV Package name + high footfall warns", () => {
  const r = validateCsvDailyFootfall(400_000, {
    name: "9호선 Turn-Key 4역 통합",
    type: "digital",
  });
  assert.equal(r.ok, true);
  assert.equal(
    r.warnings.some((w) => w.code === "package_network_scale"),
    true,
  );
});

test("omitted fields are not present in values", () => {
  const r = validateMediaMetricsWrite({ dailyFootfall: 1 });
  assert.equal("impressions" in r.values, false);
  assert.equal("cpm" in r.values, false);
});

test("gate requires ack for warnings, errors never ack-able", () => {
  const warned = validateMediaMetricsWrite(
    { impressions: 18_500_000 },
    {
      name: "Full Package LED",
      type: "digital",
      subCategory: "led_screen",
      widthM: 20,
      heightM: 10,
    },
  );
  const blocked = gateMediaMetricsWrite(warned, {
    acknowledgeWarnings: false,
  });
  assert.equal(blocked.kind, "needs_ack");
  const allowed = gateMediaMetricsWrite(warned, {
    acknowledgeWarnings: true,
  });
  assert.equal(allowed.kind, "ok");

  const capped = validateMediaMetricsWrite(
    { impressions: 64_000_000 },
    { name: "버스", type: "mobile", subCategory: "bus_exterior" },
  );
  const stillError = gateMediaMetricsWrite(capped, {
    acknowledgeWarnings: true,
  });
  assert.equal(stillError.kind, "error");
});

test("CSV/batch gate does not require ack for non-PKG warnings", () => {
  const warned = validateMediaMetricsWrite(
    {
      dailyFootfall: 100_000,
      impressions: 100_000 * MEDIA_IMPRESSIONS_VS_DAILY_WARN_DAYS + 1,
    },
    { type: "static", name: "일반 빌보드" },
  );
  const g = gateMediaMetricsWrite(warned, { requireAckForWarnings: false });
  assert.equal(g.kind, "ok");
});

test("CSV/bulk rejects Package+oversize instead of silently saving", () => {
  const r = validateCsvDailyFootfall(1_600_000, {
    name: "지하철 5678호선 CM보드 Full Package 광고",
    type: "digital",
    subCategory: "subway_station",
  });
  assert.equal(r.ok, true);
  const g = gateMediaMetricsWrite(r, {
    requireAckForWarnings: false,
    rejectPackageScaleOnBatch: true,
  });
  assert.equal(g.kind, "error");
  assert.equal(
    g.result.errors.some((e) => e.code === "package_network_scale"),
    true,
  );
});

test("network 5M cap allows 4.99M aggregate, rejects 5.000001M", () => {
  assert.equal(validateNetworkAggregateFootfall(4_990_000).ok, true);
  assert.equal(validateNetworkAggregateFootfall(5_000_001).ok, false);
});

test("CC Full Package catalog rows are not MediaNetwork 5M-capped", () => {
  const airport = validateMediaMetricsWrite(
    { impressions: 4_500_000, dailyFootfall: 350_000, cpm: 4_444 },
    {
      name: "인천국제공항 키로뷰 Full Package 광고",
      type: "digital",
      subCategory: "airport",
      price: 20_000_000,
    },
  );
  assert.equal(airport.ok, true);
  assert.equal(
    airport.warnings.some((w) => w.code === "package_network_scale"),
    true,
  );
  assert.equal(
    airport.errors.some((e) => e.code === "daily_footfall_cap"),
    false,
  );
});

test("validateMappedMediaMetrics wires quick-add fields", () => {
  const r = validateMappedMediaMetrics({
    name: "G버스 TV",
    type: "mobile",
    subCategory: "bus_interior",
    impressions: 64_000_000,
    dailyFootfall: 1_000_000,
    price: 64_000_000,
    cpm: 1000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.errors.some((e) => e.code === "impressions_class_cap"), true);
});

test("network aggregate uses 5M cap, location uses 2M cap", () => {
  const aggOk = validateNetworkAggregateFootfall(NETWORK_DAILY_FOOTFALL_CAP);
  assert.equal(aggOk.ok, true);
  const aggBad = validateNetworkAggregateFootfall(
    NETWORK_DAILY_FOOTFALL_CAP + 1,
  );
  assert.equal(aggBad.ok, false);
  const locBad = validateNetworkLocationFootfall(MEDIA_DAILY_FOOTFALL_MAX + 1);
  assert.equal(locBad.ok, false);
});

test("grandfather: impressions cap does not apply when impressions omitted", () => {
  const r = validateMediaMetricsWrite(
    { dailyFootfall: 80_000 },
    {
      name: "G버스 TV",
      type: "mobile",
      subCategory: "bus_interior",
      existingImpressions: 64_000_000,
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.errors.some((e) => e.code === "impressions_class_cap"), false);
});
