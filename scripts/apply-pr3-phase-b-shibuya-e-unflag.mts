#!/usr/bin/env npx tsx
/**
 * Phase B E — 시부야 4건: dailyFootfall × SOV × 30 → impressions,
 * matching CPM, reviewStatus=reviewed.
 *
 * SOV = resolveSovShareWithBasis() (Phase 1). spot/loop 있으면 derived,
 * 없으면 클래스 DEFAULT (default). contactRate 는 넣지 않음.
 *
 * #428 cap 이탈 또는 SOV 클래스 CPM_BOUNDS 이탈 건은 execute 제외.
 *
 *   npx tsx scripts/apply-pr3-phase-b-shibuya-e-unflag.mts --dry-run --allow-prod
 *   npx tsx scripts/apply-pr3-phase-b-shibuya-e-unflag.mts --apply --confirm=shibuya-e-sov --allow-prod
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { estimateCatalogCpmWon } from "../lib/media-metrics.ts";
import {
  gateMediaMetricsWrite,
  MEDIA_MONTHLY_IMPRESSIONS_CAP,
  validateMediaMetricsWrite,
} from "../lib/media-metrics-write.ts";
import { publicActiveMediaWhere } from "../lib/media-review-status.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import { CPM_BOUNDS, DAYS_PER_MONTH } from "../lib/metrics/constants.ts";
import { isCpmInRange } from "../lib/metrics/cpm.ts";
import { resolveSovShareWithBasis } from "../lib/metrics/defaults.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");
const confirmed = process.argv.includes("--confirm=shibuya-e-sov");

if (allowProd) {
  config({ path: resolve(root, ".env.vercel.production"), override: true });
}

const SHIBUYA_IDS = [
  "cmsyguc6s000u04l2ybgpbbwp",
  "cmsyx0h1c001c04ji8ck0gixm",
  "cmsyvvvbi000c04jiczu69c5c",
  "cmsywe2z2001604jvcecrobiz",
] as const;

const EXPECT_DAILY = 70_000;

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(raw)) {
    return undefined;
  }
  return raw;
}

async function main() {
  if (apply && !confirmed) {
    throw new Error("--apply 는 --confirm=shibuya-e-sov 과 함께 써야 합니다");
  }
  if (apply && !allowProd) {
    throw new Error("production 적용은 --allow-prod 필수");
  }

  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await db.media.findMany({
      where: { id: { in: [...SHIBUYA_IDS] } },
      select: {
        id: true,
        name: true,
        impressions: true,
        dailyFootfall: true,
        price: true,
        cpm: true,
        reviewStatus: true,
        reviewReason: true,
        flaggedAt: true,
        isActive: true,
        type: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
        widthM: true,
        heightM: true,
        description: true,
        priceNote: true,
        factSheet: {
          select: {
            spotDurationSec: true,
            loopDurationSec: true,
            playsPerHour: true,
            forceLoopSov: true,
          },
        },
      },
    });

    if (rows.length !== SHIBUYA_IDS.length) {
      const found = new Set(rows.map((r) => r.id));
      const missing = SHIBUYA_IDS.filter((id) => !found.has(id));
      throw new Error(`missing rows: ${missing.join(",")}`);
    }

    const planned = rows.map((row) => {
      if (row.dailyFootfall !== EXPECT_DAILY) {
        throw new Error(
          `${row.id} dailyFootfall=${row.dailyFootfall}, expected ${EXPECT_DAILY}`,
        );
      }
      if (row.reviewStatus !== "flagged") {
        throw new Error(
          `${row.id} reviewStatus=${row.reviewStatus}, expected flagged`,
        );
      }
      if (row.impressions != null) {
        throw new Error(`${row.id} impressions already ${row.impressions}`);
      }

      const classifyInput = {
        type: row.type,
        subCategory: row.mediaSubCategory,
        mainCategory: row.mediaMainCategory,
        name: row.name,
      };
      const sovClass = classifyMedia(classifyInput);
      const gateClass = classifyMedia({
        ...classifyInput,
        widthM: row.widthM,
        heightM: row.heightM,
      });

      const fs = row.factSheet;
      const sov = resolveSovShareWithBasis({
        type: row.type,
        subCategory: row.mediaSubCategory ?? undefined,
        mainCategory: row.mediaMainCategory ?? undefined,
        name: row.name,
        forceLoopSov: fs?.forceLoopSov === true,
        spotDuration: fs?.spotDurationSec ?? undefined,
        loopDuration: fs?.loopDurationSec ?? undefined,
        playsPerHour: fs?.playsPerHour ?? undefined,
      });

      const newImp = Math.round(EXPECT_DAILY * sov.value * DAYS_PER_MONTH);
      const newCpm = Math.round(
        estimateCatalogCpmWon({
          price: row.price,
          impressions: newImp,
          dailyFootTraffic: EXPECT_DAILY,
          cpm: undefined,
          monthlyFootTraffic: undefined,
        }) ?? NaN,
      );
      if (!Number.isFinite(newCpm) || newCpm <= 0) {
        throw new Error(`${row.id} CPM recalc failed (price=${row.price})`);
      }

      const cap = MEDIA_MONTHLY_IMPRESSIONS_CAP[gateClass];
      const cpmBounds = CPM_BOUNDS[sovClass];
      const capPass = newImp <= cap;
      const cpmInBounds = isCpmInRange(newCpm, sovClass);

      const ctx = {
        name: row.name,
        type: row.type,
        mainCategory: row.mediaMainCategory,
        subCategory: row.mediaSubCategory ?? row.subCategory,
        widthM: row.widthM,
        heightM: row.heightM,
        description: row.description,
        priceNote: row.priceNote,
        price: row.price,
        existingDailyFootfall: row.dailyFootfall,
        existingImpressions: row.impressions,
        existingCpm: row.cpm,
      };
      const preGate = validateMediaMetricsWrite(
        { impressions: newImp, cpm: newCpm },
        ctx,
      );
      const gated = gateMediaMetricsWrite(preGate, {
        acknowledgeWarnings: true,
        requireAckForWarnings: true,
      });
      const gateOk =
        preGate.ok &&
        gated.kind === "ok" &&
        preGate.errors.length === 0 &&
        preGate.warnings.length === 0;
      const eligible = gateOk && capPass && cpmInBounds;

      return {
        id: row.id,
        name: row.name,
        sovClass,
        gateClass,
        cap,
        capPass,
        cpmBounds: { min: cpmBounds[0], max: cpmBounds[1] },
        cpmInBounds,
        dailyFootfall: row.dailyFootfall,
        price: row.price,
        sovShare: sov.value,
        sovBasis: sov.basis,
        newImpressions: newImp,
        newCpm,
        gateOk,
        eligible,
        excludeReason: eligible
          ? null
          : [
              !capPass ? `cap ${gateClass} ${cap}` : null,
              !cpmInBounds
                ? `CPM_BOUNDS ${sovClass} ${cpmBounds[0]}–${cpmBounds[1]}`
                : null,
              !gateOk ? "#428 gate" : null,
            ].filter(Boolean),
      };
    });

    const executeRows = planned.filter((p) => p.eligible);
    const excludedRows = planned.filter((p) => !p.eligible);

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            formula: "impressions = round(dailyFootfall * sovShare * 30)",
            executeCount: executeRows.length,
            excludedCount: excludedRows.length,
            rows: planned,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (executeRows.length === 0) {
      throw new Error("execute 대상 0건 — CPM_BOUNDS 또는 cap 이탈");
    }

    for (const p of executeRows) {
      const upd = await pool.query(
        `UPDATE media
         SET impressions = $1,
             cpm = $2,
             review_status = 'reviewed',
             review_reason = NULL,
             flagged_at = NULL,
             updated_at = NOW()
         WHERE id = $3
           AND impressions IS NULL
           AND daily_footfall = $4
           AND review_status = 'flagged'`,
        [p.newImpressions, p.newCpm, p.id, EXPECT_DAILY],
      );
      if (upd.rowCount !== 1) {
        throw new Error(`UPDATE rowCount=${upd.rowCount} for ${p.id}`);
      }
    }

    const afterIds = executeRows.map((p) => p.id);
    const after = await db.media.findMany({
      where: { id: { in: afterIds } },
      select: {
        id: true,
        name: true,
        impressions: true,
        cpm: true,
        dailyFootfall: true,
        reviewStatus: true,
        reviewReason: true,
        flaggedAt: true,
        isActive: true,
      },
    });

    const publicHits = await db.media.findMany({
      where: publicActiveMediaWhere({ id: { in: afterIds } }),
      select: { id: true, reviewStatus: true, impressions: true },
    });

    console.log(
      JSON.stringify(
        {
          mode: "apply",
          skipped: excludedRows.map((p) => ({
            id: p.id,
            name: p.name,
            excludeReason: p.excludeReason,
          })),
          after,
          publicVisible: publicHits.length,
          publicHits,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
