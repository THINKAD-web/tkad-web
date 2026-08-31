/**
 * R-02 A-1 — price ×10 dry-run (DB 쓰기 없음).
 *
 * Usage:
 *   npx tsx scripts/dry-run-r02-price-x10.mts
 *   npx tsx scripts/dry-run-r02-price-x10.mts --out=reports/dry-run-r02-price-x10.json
 */
import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { auditRow, parseLabelDays } from "../lib/metrics/audit-rules.ts";
import type { AuditAccumulator, AuditMediaRow } from "../lib/metrics/audit-rules.ts";
import { periodToDays } from "../lib/metrics/price.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import { CPM_BOUNDS } from "../lib/metrics/constants.ts";
import {
  estimateCatalogCpmWon,
  resolveDisplayCpmWon,
} from "../lib/media-metrics.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

type ClassificationEntry = {
  id: string;
  slug?: string | null;
  name?: string;
  classification?: string;
};

function parseArgs() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  return {
    out: outArg
      ? outArg.slice("--out=".length)
      : "reports/dry-run-r02-price-x10.json",
    classification: resolve(root, "reports/directive-a-r02-classification.json"),
  };
}

function labelPeriodCrossCheck(row: AuditMediaRow) {
  const baseDays = periodToDays(row.pricePeriod);
  const nameDays = parseLabelDays(row.name);
  const noteDays = parseLabelDays(row.priceNote);
  const optionLabels = Array.isArray(row.priceOptions)
    ? row.priceOptions.map((o) => {
        if (!o || typeof o !== "object") return null;
        const rec = o as Record<string, unknown>;
        return {
          label: String(rec.label ?? ""),
          period: String(rec.period ?? row.pricePeriod ?? ""),
          labelDays: parseLabelDays(String(rec.label ?? "")),
          periodDays: periodToDays(String(rec.period ?? row.pricePeriod ?? "")),
          price: typeof rec.price === "number" ? rec.price : null,
        };
      })
    : [];

  const looksMonthly =
    row.pricePeriod === "month" ||
    nameDays === 30 ||
    noteDays === 30 ||
    optionLabels.some((o) => o?.labelDays === 30 || o?.periodDays === 30);

  const looksWeekly =
    row.pricePeriod === "week" ||
    nameDays === 7 ||
    optionLabels.some((o) => o?.labelDays === 7 || o?.periodDays === 7);

  return {
    baseDays,
    nameDays,
    noteDays,
    looksMonthly,
    looksWeekly,
    optionLabels,
  };
}

function emptyAcc(): AuditAccumulator {
  return {
    violations: [],
    fieldGaps: {},
    cpmSamples: [],
  };
}

async function main() {
  const { out, classification } = parseArgs();
  const auditPath = resolve(root, "audit-report.json");
  const auditData = JSON.parse(readFileSync(auditPath, "utf8")) as {
    violations?: Array<{ rule: string; mediaId: string }>;
  };
  const r02Ids = [
    ...new Set(
      (auditData.violations ?? [])
        .filter((v) => v.rule === "R-02")
        .map((v) => v.mediaId),
    ),
  ];

  const classData = JSON.parse(readFileSync(classification, "utf8")) as {
    classificationSamples?: { A_scale_error?: ClassificationEntry[] };
  };
  const sampleIds =
    classData.classificationSamples?.A_scale_error?.map((c) => c.id) ?? [];
  const candidates = r02Ids.length > 0 ? r02Ids : sampleIds;

  const dbUrl = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!dbUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = (await prisma.media.findMany({
    where: { id: { in: candidates }, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      price: true,
      pricePeriod: true,
      priceOptions: true,
      priceNote: true,
      dailyFootfall: true,
      impressions: true,
      cpm: true,
      mediaMainCategory: true,
      mediaSubCategory: true,
    },
  })) as unknown as AuditMediaRow[];

  const reportRows = rows.map((row) => {
    const mediaClass = classifyMedia({
      type: row.type ?? "",
      subCategory: row.mediaSubCategory,
      mainCategory: row.mediaMainCategory,
      name: row.name,
    });
    const bounds = CPM_BOUNDS[mediaClass];
    const metricsInput = {
      cpm: row.cpm ?? undefined,
      price: row.price,
      impressions: row.impressions ?? undefined,
      dailyFootTraffic: row.dailyFootfall ?? 0,
    };
    const currentDisplayCpm = resolveDisplayCpmWon(metricsInput);
    const currentRecalcCpm = estimateCatalogCpmWon(metricsInput);
    const correctedPrice = row.price * 10;
    const correctedMetricsInput = {
      ...metricsInput,
      price: correctedPrice,
      // execute 스크립트와 동일 — stored CPM 도 ×10 반영
      cpm:
        typeof row.cpm === "number" && row.cpm > 0
          ? Math.round(row.cpm * 10)
          : undefined,
    };
    const correctedDisplayCpm = resolveDisplayCpmWon(correctedMetricsInput);
    const correctedRecalcCpm = estimateCatalogCpmWon(correctedMetricsInput);
    const cross = labelPeriodCrossCheck(row);

    const auditBefore = emptyAcc();
    auditRow(row, auditBefore);
    const auditAfter = emptyAcc();
    auditRow(
      {
        ...row,
        price: correctedPrice,
        cpm: correctedMetricsInput.cpm ?? row.cpm,
      },
      auditAfter,
    );

    const displayInBoundsAfter =
      correctedDisplayCpm != null &&
      correctedDisplayCpm >= bounds[0] &&
      correctedDisplayCpm <= bounds[1];
    const auditCleanAfter =
      auditAfter.violations.filter((v) => v.rule === "R-02").length === 0;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      type: row.type,
      mediaClass,
      currentPrice: row.price,
      correctedPrice,
      pricePeriod: row.pricePeriod,
      priceOptions: row.priceOptions,
      impressions: row.impressions,
      dailyFootfall: row.dailyFootfall,
      crossCheck: cross,
      monthlyProductLikely: cross.looksMonthly,
      currentCpm: row.cpm,
      currentDisplayCpm:
        currentDisplayCpm != null ? Math.round(currentDisplayCpm) : null,
      currentRecalcCpm:
        currentRecalcCpm != null ? Math.round(currentRecalcCpm) : null,
      correctedCpm: correctedMetricsInput.cpm ?? null,
      correctedDisplayCpm:
        correctedDisplayCpm != null ? Math.round(correctedDisplayCpm) : null,
      correctedRecalcCpm:
        correctedRecalcCpm != null ? Math.round(correctedRecalcCpm) : null,
      cpmBounds: bounds,
      displayInBoundsAfter,
      auditCleanAfter,
      inBoundsAfter: displayInBoundsAfter && auditCleanAfter,
      r02Before: auditBefore.violations.filter((v) => v.rule === "R-02").length,
      r02After: auditAfter.violations.filter((v) => v.rule === "R-02").length,
      recommendation:
        displayInBoundsAfter && auditCleanAfter
          ? cross.looksMonthly
            ? "approve_candidate"
            : "review_label_mismatch"
          : "reject_not_in_bounds",
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    foundInDb: reportRows.length,
    approveCandidate: reportRows.filter(
      (r) => r.recommendation === "approve_candidate",
    ).length,
    reviewLabel: reportRows.filter(
      (r) => r.recommendation === "review_label_mismatch",
    ).length,
    rejectNotInBounds: reportRows.filter(
      (r) => r.recommendation === "reject_not_in_bounds",
    ).length,
    inBoundsAfter: reportRows.filter((r) => r.inBoundsAfter).length,
    rows: reportRows,
  };

  mkdirSync(dirname(resolve(root, out)), { recursive: true });
  writeFileSync(resolve(root, out), JSON.stringify(summary, null, 2));
  console.log(
    `dry-run complete: ${summary.approveCandidate} approve / ${summary.reviewLabel} review / ${summary.rejectNotInBounds} reject`,
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
