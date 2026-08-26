import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { basisToBadge } from "@/lib/planner/brief/basis-to-badge";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import {
  briefScreenExportKpiBadges,
  briefSnapshotExportKpiBadges,
  payloadKpiBadgeSequence,
} from "@/lib/planner/brief/brief-export-kpi-badges";
import { assertAllKpisHaveBadge } from "@/lib/planner-report-export/export-badge";

const catalogMedia: MediaItem = {
  id: "m-parity-1",
  name: "패리티 테스트",
  nameEn: "Parity Test",
  type: "static",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  price: 800_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 5000,
  sampleImages: [],
};

const snapshot: CampaignPlanSnapshot = {
  engineVersion: "test",
  brief: {
    budgetWon: 30_000_000,
    regionCodes: ["11"],
    goal: "awareness",
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  },
  mediaMix: [
    {
      mediaId: catalogMedia.id,
      name: catalogMedia.name,
      units: 2,
      days: 30,
      priceWon: 1_600_000,
      priceIsEstimate: false,
      impressions: 240_000,
      cpmWon: 6667,
    },
  ],
  metrics: {
    netReach: 0,
    targetPopulation: 0,
    reachRate: 0,
    frequency: 0,
    grp: 0,
    effectiveReach: 0,
    effectiveReachRate: 0,
    totalImpressions: 240_000,
    mixCpmWon: 6667,
    totalCostWon: 1_600_000,
    overBudgetWon: 0,
    budgetUsedRate: 1_600_000 / 30_000_000,
    dataQuality: {
      totalCostWon: "measured",
      totalImpressions: "derived",
      mixCpmWon: "derived",
      netReach: null,
      reachRate: null,
      frequency: null,
      grp: null,
    },
  },
};

test("S-5: Step3 live snapshot — 화면 basis === PDF payload 배지", () => {
  const liveSnapshot = buildCampaignPlanSnapshot({
    brief: {
      budgetInputWon: snapshot.brief.budgetWon,
      budgetMode: "total",
      regionCodes: snapshot.brief.regionCodes as never,
      genders: [],
      ageBands: [],
      goal: "awareness",
      industry: null,
      flightStart: snapshot.brief.flightStart,
      flightEnd: snapshot.brief.flightEnd,
      freeText: "",
    },
    catalog: [catalogMedia],
    mixUnits: { [catalogMedia.id]: 2 },
  });
  const screenBadges = briefScreenExportKpiBadges(liveSnapshot, [catalogMedia]);
  const payload = buildBriefReportPayload({
    plan: liveSnapshot,
    catalog: [catalogMedia],
    isKo: true,
  });
  const payloadBadges = payloadKpiBadgeSequence(payload);
  assert.deepEqual(payloadBadges, screenBadges);
  assertAllKpisHaveBadge(payload.kpis);
});

test("S-5: snapshot dataQuality 배지 === payload 배지", () => {
  const snapshotBadges = briefSnapshotExportKpiBadges(snapshot);
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.deepEqual(payloadKpiBadgeSequence(payload), snapshotBadges);
});

test("S-4: 모든 KPI에 badge 필드 존재", () => {
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.ok(payload.kpis.length >= 3);
  for (const k of payload.kpis) {
    assert.ok(k.badge, `missing badge on ${k.label}`);
  }
});

test("basisToBadge stays in lib so server PDF/dry-run can call it", () => {
  assert.equal(basisToBadge("measured"), "measured");
  assert.equal(basisToBadge("derived"), "estimated");
  assert.equal(basisToBadge(null), "pending");
  const src = readFileSync(
    resolve("lib/planner-report-export/export-badge.ts"),
    "utf8",
  );
  assert.equal(src.includes("data-quality-badge"), false);
  assert.equal(src.includes("@/lib/planner/brief/basis-to-badge"), true);
});
