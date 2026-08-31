/**
 * R-02 잔여 13건 — 개별 원인·정정값 분석 (DB 읽기 전용).
 *
 * Usage:
 *   npx tsx scripts/analyze-r02-residual-13.mts
 *   npx tsx scripts/analyze-r02-residual-13.mts --out=reports/r02-residual-13-review.json
 */
import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { auditRow, type AuditAccumulator, type AuditMediaRow } from "../lib/metrics/audit-rules.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import { CPM_BOUNDS } from "../lib/metrics/constants.ts";
import {
  estimateCatalogCpmWon,
  resolveDisplayCpmWon,
  resolveMonthlyImpressions,
} from "../lib/media-metrics.ts";
import { catalogPriceFieldToWon } from "../lib/media-price-format.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

function parseArgs() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  return {
    out: outArg
      ? outArg.slice("--out=".length)
      : "reports/r02-residual-13-review.json",
  };
}

function suggestPriceForCpm(
  targetCpm: number,
  impressions: number,
): number {
  return Math.round((targetCpm * impressions) / 1000);
}

async function main() {
  const { out } = parseArgs();
  const executeReport = JSON.parse(
    readFileSync(resolve(root, "reports/r02-price-x10-execute.json"), "utf8"),
  ) as { results: Array<{ id: string; name: string; priceAfter: number; cpmAfter: number | null }> };

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows: Array<Record<string, unknown>> = [];

  for (const ex of executeReport.results) {
    const row = (await db.media.findUnique({
      where: { id: ex.id },
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
    })) as AuditMediaRow | null;
    if (!row) continue;

    const acc: AuditAccumulator = { violations: [], fieldGaps: {}, cpmSamples: [] };
    auditRow(row, acc);
    const r02 = acc.violations.filter((v) => v.rule === "R-02");
    if (r02.length === 0) continue;

    const mediaClass = classifyMedia({
      type: row.type ?? "",
      subCategory: row.mediaSubCategory,
      mainCategory: row.mediaMainCategory,
      name: row.name,
    });
    const bounds = CPM_BOUNDS[mediaClass];
    const monthlyImp = resolveMonthlyImpressions({
      cpm: row.cpm ?? undefined,
      price: row.price,
      impressions: row.impressions ?? undefined,
      dailyFootTraffic: row.dailyFootfall ?? 0,
    });
    const recalcCpm = estimateCatalogCpmWon({
      cpm: row.cpm ?? undefined,
      price: row.price,
      impressions: row.impressions ?? undefined,
      dailyFootTraffic: row.dailyFootfall ?? 0,
    });
    const displayCpm = resolveDisplayCpmWon({
      cpm: row.cpm ?? undefined,
      price: row.price,
      impressions: row.impressions ?? undefined,
      dailyFootTraffic: row.dailyFootfall ?? 0,
    });

    const storedVsRecalcRatio =
      row.cpm && recalcCpm && recalcCpm > 0 ? row.cpm / recalcCpm : null;

    // 표시 CPM 이 bounds 안에 들어오도록 하는 가격 (recalc = display 가 되도록 cpm 동기화 가정)
    const priceForMinCpm = suggestPriceForCpm(bounds[0], monthlyImp);
    const priceForMaxCpm = suggestPriceForCpm(bounds[1], monthlyImp);
    const priceForMidCpm = suggestPriceForCpm(
      Math.round((bounds[0] + bounds[1]) / 2),
      monthlyImp,
    );

    let rootCause = "unknown";
    if (storedVsRecalcRatio != null && (storedVsRecalcRatio < 0.85 || storedVsRecalcRatio > 1.15)) {
      rootCause =
        recalcCpm != null && recalcCpm > bounds[1]
          ? "price_too_high_for_impressions_after_x10"
          : recalcCpm != null && recalcCpm < bounds[0]
            ? "price_too_low_recalc"
            : "stored_cpm_out_of_sync_with_price_impressions";
    } else if (recalcCpm != null && recalcCpm > bounds[1]) {
      rootCause = "recalc_cpm_above_bounds";
    } else if (recalcCpm != null && recalcCpm < bounds[0]) {
      rootCause = "recalc_cpm_below_bounds";
    }

    rows.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      mediaClass,
      priceCurrent: row.price,
      pricePeriod: row.pricePeriod,
      cpmStored: row.cpm,
      cpmRecalc: recalcCpm != null ? Math.round(recalcCpm) : null,
      cpmDisplay: displayCpm != null ? Math.round(displayCpm) : null,
      cpmBounds: bounds,
      monthlyImpressions: monthlyImp,
      dailyFootfall: row.dailyFootfall,
      storedVsRecalcRatio:
        storedVsRecalcRatio != null
          ? Math.round(storedVsRecalcRatio * 100) / 100
          : null,
      rootCause,
      r02Message: r02.map((v) => v.message).join(" | "),
      suggestedPrice: {
        forMinCpm: priceForMinCpm,
        forMidCpm: priceForMidCpm,
        forMaxCpm: priceForMaxCpm,
      },
      suggestedCpmAtMidPrice: Math.round((bounds[0] + bounds[1]) / 2),
      note:
        rootCause === "price_too_high_for_impressions_after_x10"
          ? "×10 보정 역효과 — 노출(impressions) 대비 가격이 과대. 가격 인하 또는 impressions 재산정 필요."
          : "stored/recalc 불일치 — price·cpm·impressions 3필드 정합 필요.",
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    rows,
  };

  mkdirSync(dirname(resolve(root, out)), { recursive: true });
  writeFileSync(resolve(root, out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out, count: rows.length }, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
