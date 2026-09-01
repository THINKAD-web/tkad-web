#!/usr/bin/env node
/**
 * PR1a Gate 6 — price → filter → card labels → PDF/PPTX → admin re-save
 * Usage: DATABASE_URL=... npx tsx scripts/audit/pr1a-gate6-validation.mts
 */
import pg from "pg";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { filterMediaByDiscoveryChips } from "../../lib/media-discovery-client-filter.ts";
import { typeLabels } from "../../lib/media-data.ts";
import { browseCategoryLabel } from "../../lib/media-browse-categories.ts";
import { mediaToDocumentDetail } from "../../lib/document-media-detail.ts";
import { DISPLAY_MODE_LABELS } from "../../lib/display-mode-labels.ts";
import { buildPlanCartReportBundle } from "../../lib/plan-cart-report/build-report.ts";
import { buildOohReportPayload } from "../../lib/planner-report-export/payload-ooh.ts";
import { buildPlannerReportPptx } from "../../lib/planner-report-export/build-pptx.ts";
import { buildPlannerReportPdf } from "../../lib/planner-report-export/build-pdf.ts";
import type { MediaItem } from "../../lib/media-data.ts";
import { prismaMediaToMediaItem } from "../../lib/public-media-catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "reports/pr1a-gate6");

const CLASSIFIED = {
  A2: "cmr9xedzi000a04layhba2ulc",
  A3a: "cmrap3eo4000004jv8b2tt90v",
  A3b: "cmrn711g8000404ib3hct4qpy",
  A3b_prod: "cmtd4wpic000004ic5oeqzdxq",
} as const;

function createDb(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) });
}

function rowToMediaItem(_row: Record<string, unknown>): MediaItem {
  throw new Error("use prismaMediaToMediaItem");
}

async function runPriceCheck(client: pg.Client) {
  const pr0Post = JSON.parse(
    readFileSync(join(root, "reports/pr0-preview-price-post.json"), "utf8"),
  );
  const sampleIds: string[] = pr0Post.sampleIds;
  const { rows } = await client.query(
    `SELECT id, name, location, type, price, price_period, price_options, partial_period_rates,
            daily_footfall, impressions, latitude, longitude
     FROM media WHERE id = ANY($1::text[])`,
    [sampleIds],
  );
  const { calculateQuote } = await import("../../lib/quote-calculator.ts");
  const startDate = new Date("2026-03-01");
  const endDate = new Date("2026-03-14");
  const scenarios = [
    { name: "calendar_14d", periodKey: undefined },
    { name: "wizard_14days", periodKey: "14days" },
    { name: "wizard_1month", periodKey: "1month" },
  ];
  const results: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const media = {
      id: r.id,
      name: r.name,
      location: r.location ?? "",
      type: r.type,
      price: Number(r.price) || 0,
      pricePeriod: r.price_period,
      priceOptions: r.price_options,
      partialPeriodRates: r.partial_period_rates,
      dailyFootfall: r.daily_footfall,
      impressions: r.impressions,
      latitude: r.latitude,
      longitude: r.longitude,
    };
    for (const sc of scenarios) {
      const q = calculateQuote({
        media: [media],
        startDate,
        endDate,
        discountRate: 0,
        periodKey: sc.periodKey,
        mediaPriceOptionIndex: {},
      });
      const line = q.lines[0];
      results.push({
        mediaId: r.id,
        scenario: sc.name,
        lineSupplyWon: line?.lineSupplyWon ?? null,
        unitPriceWon: line?.unitPriceWon ?? null,
        totalWon: q.totalWon,
      });
    }
  }
  const preMap = new Map(
    pr0Post.results.map((r: { mediaId: string; scenario: string }) => [
      `${r.mediaId}|${(r as { scenario: string }).scenario}`,
      r,
    ]),
  );
  let matched = 0;
  const diffs: unknown[] = [];
  for (const p of results) {
    const k = `${p.mediaId}|${p.scenario}`;
    const b = preMap.get(k) as Record<string, unknown> | undefined;
    if (!b) {
      diffs.push({ key: k, issue: "missing in pr0 post" });
      continue;
    }
    const fields = ["lineSupplyWon", "unitPriceWon", "totalWon"];
    const fieldDiffs: Record<string, unknown> = {};
    for (const f of fields) {
      if (b[f] !== p[f]) fieldDiffs[f] = { pr0: b[f], pr1a: p[f] };
    }
    if (Object.keys(fieldDiffs).length === 0) matched++;
    else diffs.push({ key: k, fieldDiffs });
  }
  return {
    pass: diffs.length === 0,
    comparedRows: results.length,
    matched,
    mismatched: diffs.length,
    diffs,
  };
}

function simulateA2CardLabels(m: MediaItem) {
  const isKo = true;
  const typeLabel =
    (isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en) ?? m.type;
  const structuredCategory =
    m.mediaMainCategory && m.mediaSubCategory
      ? `${browseCategoryLabel(m.mediaMainCategory, "ko", "main")} · ${browseCategoryLabel(m.mediaSubCategory, "ko", "sub", m.mediaMainCategory)}`
      : null;
  const docDetail = mediaToDocumentDetail(m, { isKo });
  const listMetaLine = [m.region, m.type].filter(Boolean).join(" · ");
  return {
    freeTextSubCategory: m.subCategory ?? null,
    structuredBrowse: structuredCategory,
    listMetaLine,
    detailHeroTypePill: typeLabel,
    displayModeLabel: DISPLAY_MODE_LABELS.mobile.ko,
    pdfCategoryLabel: docDetail.categoryLabel ?? null,
    duplicateRisk:
      Boolean(m.subCategory?.trim()) &&
      Boolean(docDetail.categoryLabel?.trim()) &&
      docDetail.categoryLabel !== m.subCategory,
  };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = createDb();
  const report: Record<string, unknown> = { at: new Date().toISOString() };

  try {
    report.price = await runPriceCheck(client);

    const dbRows = await db.media.findMany({
      where: { isActive: { not: false }, country: "KR" },
    });
    const catalog = dbRows.map((r) => prismaMediaToMediaItem(r));

    const filterChecks: Record<string, unknown> = {};
    for (const [key, filter] of [
      ["vehicle_wrap", { mainCategory: "transit", subCategory: "vehicle_wrap" }],
      ["digital_signage", { mainCategory: "ooh", subCategory: "digital_signage" }],
      ["subway_station", { mainCategory: "transit", subCategory: "subway_station" }],
    ] as const) {
      const filtered = filterMediaByDiscoveryChips(catalog, filter);
      filterChecks[key] = {
        count: filtered.length,
        hasA2: filtered.some((m) => m.id === CLASSIFIED.A2),
        hasA3a: filtered.some((m) => m.id === CLASSIFIED.A3a),
        hasA3b: filtered.some((m) => m.id === CLASSIFIED.A3b),
        hasA3bProd: filtered.some((m) => m.id === CLASSIFIED.A3b_prod),
      };
    }
    report.filters = filterChecks;

    const a2Row = catalog.find((m) => m.id === CLASSIFIED.A2);
    if (!a2Row) throw new Error("A2 not in catalog");
    report.a2CardLabels = simulateA2CardLabels(a2Row);

    const sampleIds = [CLASSIFIED.A2, CLASSIFIED.A3a, "cmoifvxb6000604jxmw7b3ov7"];
    const portfolio = catalog.filter((m) => sampleIds.includes(m.id));
    const cart = {
      items: portfolio.map((m) => ({
        mediaId: m.id,
        mediaName: m.name,
        mediaType: m.type,
        region: m.region ?? "서울",
        price: m.price,
        quantity: 1,
      })),
      campaignGoal: "awareness" as const,
      totalBudget: 50_000,
      duration: 1,
      updatedAt: new Date().toISOString(),
    };
    const bundle = buildPlanCartReportBundle({ cart, catalog, isKo: true });
    if (!bundle) throw new Error("null bundle");
    const payload = buildOohReportPayload({
      isKo: true,
      goalTitle: bundle.reportProps.goalTitle,
      budgetMan: bundle.reportProps.budgetNum,
      periodDisplay: "2026-09-01 ~ 2026-09-30",
      regionsText: bundle.reportProps.regionsText,
      categoriesText: bundle.reportProps.categoriesText,
      ageText: bundle.reportProps.ageText,
      industryText: bundle.reportProps.industryText,
      portfolio: bundle.reportProps.portfolio,
      metrics: bundle.reportProps.metrics,
      blendedCpmKrw: null,
      budgetAllocation: [],
      cpmBars: [],
      effectSummaryLines: [],
      generatedAt: new Date().toLocaleString("ko-KR"),
      months: 1,
    });
    report.pdfPptx = {
      categoriesText: bundle.reportProps.categoriesText,
      hasDigitalDisplayLabel: bundle.reportProps.categoriesText.includes(
        DISPLAY_MODE_LABELS.dooh.ko,
      ),
      bareDigitalToken:
        /\b디지털\b/.test(bundle.reportProps.categoriesText) &&
        !bundle.reportProps.categoriesText.includes(DISPLAY_MODE_LABELS.dooh.ko),
    };

    const pdfBuf = await buildPlannerReportPdf(payload);
    const pptxBuf = await buildPlannerReportPptx(payload);
    const pdfPath = join(outDir, "gate6-sample-report.pdf");
    const pptxPath = join(outDir, "gate6-sample-report.pptx");
    writeFileSync(pdfPath, pdfBuf);
    writeFileSync(pptxPath, pptxBuf);
    report.pdfPptx.files = { pdfPath, pptxPath, pdfBytes: pdfBuf.length, pptxBytes: pptxBuf.length };

    const a2Before = await db.media.findUnique({ where: { id: CLASSIFIED.A2 } });
    await db.media.update({
      where: { id: CLASSIFIED.A2 },
      data: { description: a2Before?.description ?? "gate6 touch" },
    });
    const a2After = await db.media.findUnique({
      where: { id: CLASSIFIED.A2 },
      select: {
        catalogChannel: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
      },
    });
    report.adminResave = {
      pass:
        a2After?.catalogChannel === "offline" &&
        a2After?.mediaMainCategory === "transit" &&
        a2After?.mediaSubCategory === "vehicle_wrap",
      after: a2After,
    };

    report.pass =
      (report.price as { pass: boolean }).pass &&
      (filterChecks.vehicle_wrap as { hasA2: boolean }).hasA2 &&
      (filterChecks.digital_signage as { hasA3a: boolean }).hasA3a &&
      (filterChecks.digital_signage as { hasA3b: boolean }).hasA3b &&
      (report.pdfPptx as { hasDigitalDisplayLabel: boolean }).hasDigitalDisplayLabel &&
      (report.adminResave as { pass: boolean }).pass;

    const outPath = join(outDir, "gate6-report.json");
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exit(1);
  } finally {
    await client.end();
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[gate6] FAIL", e);
  process.exit(1);
});
