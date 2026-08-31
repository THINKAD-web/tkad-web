import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { buildCampaignPlanSnapshot } from "../build-plan-snapshot.ts";
import { buildBriefReportPayload } from "../brief-report-adapter.ts";
import { EMPTY_BRIEF } from "../types.ts";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { customMixEntryToExportRow } from "../custom-export.ts";

const catalogMedia: MediaItem = {
  id: "m-export-1",
  name: "테스트 DOOH",
  nameEn: "Test DOOH",
  type: "static",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  price: 10_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 50_000,
  impressions: 1_500_000,
  sampleImages: ["https://cdn.example.test/m.jpg"],
};

test("customMixEntryToExportRow: 산정 불가 + no thumb", () => {
  const row = customMixEntryToExportRow(
    {
      kind: "custom",
      lineId: "custom-abc",
      name: "협의 매체",
      quantity: 2,
      unitPriceWon: 1_000_000,
      days: 30,
      priceWon: 2_000_000,
    },
    true,
  );
  assert.equal(row.kind, "custom");
  assert.equal(row.metricsUnavailableLabel, "산정 불가");
  assert.equal(row.thumbUrl, undefined);
  assert.match(row.lineTotalLabel ?? "", /2,000,000/);
});

test("buildBriefReportPayload: custom + catalog 혼합 export", () => {
  const snap = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    catalog: [catalogMedia],
    mixUnits: { [catalogMedia.id]: 1 },
    customLines: [
      {
        lineId: "custom-x",
        name: "특수 협의",
        quantity: 1,
        unitPriceWon: 3_000_000,
      },
    ],
  });

  const payload = buildBriefReportPayload({
    plan: snap,
    catalog: [catalogMedia],
    isKo: true,
  });

  assert.equal(payload.portfolio.length, 2);
  const customRow = payload.portfolio.find((r) => r.kind === "custom");
  assert.ok(customRow);
  assert.equal(customRow!.name, "특수 협의");
  assert.equal(customRow!.metricsUnavailableLabel, "산정 불가");

  assert.ok(payload.budgetHonesty);
  assert.ok(
    payload.budgetHonesty!.mixWon >= snap.metrics.totalCostWon - 1,
    "mixWon includes custom cost",
  );
  assert.ok(payload.quoteSummary);
  assert.ok(payload.quoteSummary!.supplyWon >= 3_000_000);
  assert.ok(
    payload.quoteSummary!.footnotes.some((f) => f.includes("커스텀 1건")),
  );
});

test("buildBriefReportPayload: legacy snapshot without custom still works", () => {
  const legacy: CampaignPlanSnapshot = {
    engineVersion: "test",
    brief: {
      budgetWon: 30_000_000,
      regionCodes: ["11"],
      genders: [],
      ageBands: [],
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    mediaMix: [
      {
        mediaId: catalogMedia.id,
        name: catalogMedia.name,
        units: 1,
        days: 30,
        priceWon: 10_000_000,
        priceIsEstimate: false,
        impressions: 500_000,
        cpmWon: 20_000,
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
      totalImpressions: 500_000,
      mixCpmWon: 20_000,
      totalCostWon: 10_000_000,
      overBudgetWon: 0,
      budgetUsedRate: 10_000_000 / 30_000_000,
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

  const payload = buildBriefReportPayload({
    plan: legacy,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.equal(payload.portfolio.filter((r) => r.kind === "custom").length, 0);
  assert.equal(payload.portfolio.length, 1);
});

test("custom mix PDF smoke", async () => {
  const snap = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    catalog: [catalogMedia],
    mixUnits: { [catalogMedia.id]: 1 },
    customLines: [
      {
        lineId: "custom-pdf",
        name: "PDF 커스텀",
        quantity: 1,
        unitPriceWon: 2_000_000,
      },
    ],
  });
  const payload = buildBriefReportPayload({
    plan: snap,
    catalog: [catalogMedia],
    isKo: true,
  });
  const pdf = await buildPlannerReportPdf(payload, {});
  assert.ok(pdf.length > 50_000);
});
