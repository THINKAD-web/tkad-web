#!/usr/bin/env npx tsx
/**
 * #411 Phase A — admin metrics guard dry-run (no DB writes)
 *
 *   npx tsx scripts/dry-run-pr3-phase411-admin-guard.mts
 *
 * 재한 확정 정책으로 실사례 픽스처를 통과시킨다.
 * DATABASE_URL 이 있으면 active KR 매체 전수 스캔(읽기 전용)을 추가한다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import {
  gateMediaMetricsWrite,
  validateCsvDailyFootfall,
  validateMappedMediaMetrics,
  validateMediaMetricsWrite,
  validateNetworkAggregateFootfall,
  type MediaMetricsWriteResult,
} from "../lib/media-metrics-write.ts";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

type CaseRow = {
  id: string;
  title: string;
  result: MediaMetricsWriteResult;
  gate: ReturnType<typeof gateMediaMetricsWrite>;
};

function runCase(
  id: string,
  title: string,
  result: MediaMetricsWriteResult,
): CaseRow {
  return {
    id,
    title,
    result,
    gate: gateMediaMetricsWrite(result, { acknowledgeWarnings: false }),
  };
}

const cases: CaseRow[] = [
  runCase(
    "gbus-64m",
    "G버스 TV 월노출 64M (bus) — hard reject",
    validateMediaMetricsWrite(
      { impressions: 64_000_000, dailyFootfall: 1_500_000, cpm: 1000 },
      {
        name: "경기 G버스 TV",
        type: "mobile",
        subCategory: "bus_interior",
        price: 64_000_000,
      },
    ),
  ),
  runCase(
    "ee-placeholder",
    "EE stored ₩3 vs recalc ~₩2,679 — 10× error + placeholder warn",
    validateMediaMetricsWrite(
      { cpm: 3, impressions: 11_198_208 },
      { price: 30_000_000, name: "EE placeholder" },
    ),
  ),
  runCase(
    "full-package-18-5m",
    "잠실 Full Package 18.5M dooh_large — cap pass + PKG warn → 409",
    validateMediaMetricsWrite(
      { impressions: 18_500_000 },
      {
        name: "잠실 롯데월드몰 Full Package",
        type: "digital",
        subCategory: "led_screen",
        widthM: 20,
        heightM: 10,
      },
    ),
  ),
  runCase(
    "metro-live-45m",
    "메트로라이브 45M subway — impressions cap reject",
    validateMediaMetricsWrite(
      { impressions: 45_000_000 },
      {
        name: "메트로라이브 Package",
        type: "digital",
        subCategory: "subway_station",
      },
    ),
  ),
  runCase(
    "normal-bus-wrap",
    "버스 래핑 1대 정상 범위 — pass",
    validateMappedMediaMetrics({
      name: "시내버스 외부 래핑 1대",
      type: "mobile",
      subCategory: "bus_exterior",
      dailyFootfall: 42_000,
      impressions: 189_000,
      price: 800_000,
      cpm: 4_233,
    }),
  ),
  runCase(
    "cc-airport-kiroview-pkg",
    "CC 인천공항 키로뷰 Full Package — catalog 4.5M imp / 350k daily (network 5M 미적용)",
    validateMediaMetricsWrite(
      { impressions: 4_500_000, dailyFootfall: 350_000, cpm: 4_444 },
      {
        name: "인천국제공항 키로뷰 Full Package 광고",
        type: "digital",
        subCategory: "airport",
        price: 20_000_000,
      },
    ),
  ),
  runCase(
    "cc-cmboard-full-package",
    "CC 5678 CM보드 Full Package 18.5M subway — class cap 15M reject",
    validateMediaMetricsWrite(
      { impressions: 18_500_000, dailyFootfall: 1_600_000 },
      {
        name: "지하철 5678호선 CM보드 Full Package 광고",
        type: "digital",
        subCategory: "subway_station",
        price: 25_000_000,
      },
    ),
  ),
];

const csvBatchGate = gateMediaMetricsWrite(
  validateCsvDailyFootfall(1_600_000, {
    name: "지하철 5678호선 CM보드 Full Package 광고",
    type: "digital",
    subCategory: "subway_station",
  }),
  { requireAckForWarnings: false, rejectPackageScaleOnBatch: true },
);

const networkChecks = [
  {
    id: "network-4.99m",
    ok: validateNetworkAggregateFootfall(4_990_000).ok,
    expect: true,
  },
  {
    id: "network-5.000001m",
    ok: validateNetworkAggregateFootfall(5_000_001).ok,
    expect: false,
  },
];

const summary = cases.map((c) => ({
  id: c.id,
  title: c.title,
  ok: c.result.ok,
  gate: c.gate.kind,
  errors: c.result.errors.map((e) => e.code),
  warnings: c.result.warnings.map((w) => w.code),
}));

console.log(
  JSON.stringify(
    {
      summary,
      csvBatchGate: csvBatchGate.kind,
      networkChecks,
    },
    null,
    2,
  ),
);

const outDir = resolve(process.cwd(), "reports");
mkdirSync(outDir, { recursive: true });
const jsonPath = resolve(outDir, "pr3-phase411-phase-a-dry-run.json");
writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary,
      csvBatchGate: csvBatchGate.kind,
      networkChecks,
      cases,
    },
    null,
    2,
  ),
);
console.log(`wrote ${jsonPath}`);

const expected: Record<string, { gate: string; error?: string; warn?: string }> =
  {
    "gbus-64m": { gate: "error", error: "impressions_class_cap" },
    "ee-placeholder": { gate: "error", error: "cpm_mismatch" },
    "full-package-18-5m": { gate: "needs_ack", warn: "package_network_scale" },
    "metro-live-45m": { gate: "error", error: "impressions_class_cap" },
    "cc-airport-kiroview-pkg": { gate: "needs_ack", warn: "package_network_scale" },
    "cc-cmboard-full-package": { gate: "error", error: "impressions_class_cap" },
    "normal-bus-wrap": { gate: "ok" },
  };

let failed = 0;
for (const c of cases) {
  const exp = expected[c.id];
  if (!exp) continue;
  if (c.gate.kind !== exp.gate) {
    console.error(`FAIL ${c.id}: gate ${c.gate.kind} !== ${exp.gate}`);
    failed += 1;
  }
  if (exp.error && !c.result.errors.some((e) => e.code === exp.error)) {
    console.error(`FAIL ${c.id}: missing error ${exp.error}`);
    failed += 1;
  }
  if (exp.warn && !c.result.warnings.some((w) => w.code === exp.warn)) {
    console.error(`FAIL ${c.id}: missing warn ${exp.warn}`);
    failed += 1;
  }
}

if (csvBatchGate.kind !== "error") {
  console.error("FAIL csv-batch PKG should error");
  failed += 1;
}
for (const n of networkChecks) {
  if (n.ok !== n.expect) {
    console.error(`FAIL ${n.id}: ok=${n.ok} expect=${n.expect}`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("fixture dry-run OK");
