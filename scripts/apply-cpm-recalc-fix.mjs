/**
 * Idempotent batch: set Media.cpm = round(estimateCatalogCpmWon) for understored rows.
 *
 * Safety:
 * - Default is dry-run (no writes).
 * - Writes require APPLY_CPM_FIX=1 AND CONFIRM_DB_HOST=<exact neon host substring>
 * - Skips within ±15%, uncomputable, and already-matching values.
 *
 * Usage:
 *   npx tsx scripts/apply-cpm-recalc-fix.mjs              # dry-run
 *   APPLY_CPM_FIX=1 CONFIRM_DB_HOST=ep-holy-cloud-... \
 *     npx tsx scripts/apply-cpm-recalc-fix.mjs            # apply
 *
 * Backup (always written before any update attempt):
 *   scripts/.backups/cpm-contamination-<ISO>.json
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const CPM_TRUST_MIN = 0.85;
const CPM_TRUST_MAX = 1.15;

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim();

const apply = process.env.APPLY_CPM_FIX === "1";
const confirmHost = (process.env.CONFIRM_DB_HOST ?? "").trim();

function hostFromUrl(url) {
  return url?.match(/@([^/?]+)/)?.[1] ?? "";
}

async function main() {
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const host = hostFromUrl(databaseUrl);
  console.log(`DB host: ${host}`);
  console.log(`mode: ${apply ? "APPLY" : "DRY-RUN"}`);

  if (apply) {
    if (!confirmHost) {
      console.error(
        "Refusing APPLY: set CONFIRM_DB_HOST to the Neon host (or prefix) you intend to write.",
      );
      process.exit(1);
    }
    if (!host.includes(confirmHost) && confirmHost !== host) {
      console.error(
        `Refusing APPLY: CONFIRM_DB_HOST="${confirmHost}" does not match actual host "${host}"`,
      );
      process.exit(1);
    }
  }

  const { estimateCatalogCpmWon } = await import("../lib/media-metrics.ts");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      cpm: true,
      impressions: true,
      dailyFootfall: true,
    },
    orderBy: { id: "asc" },
  });

  const candidates = [];
  const skipped = {
    noStoredCpm: 0,
    within15: 0,
    uncomputable: 0,
    alreadyEqual: 0,
    overstored: 0,
  };

  for (const row of rows) {
    const stored =
      typeof row.cpm === "number" && Number.isFinite(row.cpm) && row.cpm > 0
        ? row.cpm
        : null;
    if (stored == null) {
      skipped.noStoredCpm += 1;
      continue;
    }

    const recalcRaw = estimateCatalogCpmWon({
      price: row.price,
      cpm: null,
      impressions: row.impressions,
      dailyFootTraffic: row.dailyFootfall,
      monthlyFootTraffic: undefined,
    });
    if (recalcRaw == null || !Number.isFinite(recalcRaw) || recalcRaw <= 0) {
      skipped.uncomputable += 1;
      continue;
    }
    const recalc = Math.round(recalcRaw);
    const ratio = stored / recalc;

    if (ratio >= CPM_TRUST_MIN && ratio <= CPM_TRUST_MAX) {
      skipped.within15 += 1;
      continue;
    }
    if (ratio > CPM_TRUST_MAX) {
      skipped.overstored += 1;
      continue;
    }
    // understored (ratio < 0.85)
    if (Math.round(stored) === recalc) {
      skipped.alreadyEqual += 1;
      continue;
    }

    candidates.push({
      id: row.id,
      name: row.name,
      storedCpm: stored,
      recalcCpm: recalc,
      ratio,
      price: row.price,
      impressions: row.impressions,
      dailyFootfall: row.dailyFootfall,
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join("scripts", ".backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `cpm-contamination-${stamp}.json`);
  const backup = {
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    host,
    count: candidates.length,
    records: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      storedCpm: c.storedCpm,
      plannedRecalcCpm: c.recalcCpm,
      ratio: c.ratio,
    })),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`backup written: ${backupPath} (${candidates.length} rows)`);
  console.log("skipped:", skipped);

  if (!apply) {
    console.log(
      `DRY-RUN complete — would update ${candidates.length} rows. Re-run with APPLY_CPM_FIX=1 CONFIRM_DB_HOST=... to write.`,
    );
    await db.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  let noop = 0;
  const samplesAfter = [];

  for (const c of candidates) {
    // Idempotent: only update if current cpm still matches the backed-up stored value
    // (or is still understored vs same recalc). Avoid clobbering concurrent edits.
    const current = await db.media.findUnique({
      where: { id: c.id },
      select: {
        id: true,
        cpm: true,
        price: true,
        impressions: true,
        dailyFootfall: true,
      },
    });
    if (!current) {
      noop += 1;
      continue;
    }
    const curStored =
      typeof current.cpm === "number" && current.cpm > 0 ? current.cpm : null;
    const curRecalcRaw = estimateCatalogCpmWon({
      price: current.price,
      cpm: null,
      impressions: current.impressions,
      dailyFootTraffic: current.dailyFootfall,
      monthlyFootTraffic: undefined,
    });
    if (curRecalcRaw == null || curRecalcRaw <= 0) {
      noop += 1;
      continue;
    }
    const curRecalc = Math.round(curRecalcRaw);
    if (curStored != null) {
      const r = curStored / curRecalc;
      if (r >= CPM_TRUST_MIN && r <= CPM_TRUST_MAX) {
        noop += 1;
        continue;
      }
      if (Math.round(curStored) === curRecalc) {
        noop += 1;
        continue;
      }
    }

    await db.media.update({
      where: { id: c.id },
      data: { cpm: curRecalc },
    });
    updated += 1;
    if (samplesAfter.length < 8) {
      samplesAfter.push({
        id: c.id,
        name: c.name,
        before: curStored,
        after: curRecalc,
      });
    }
  }

  const resultPath = join(
    "scripts",
    ".dry-run-cpm-contamination",
    `apply-result-${stamp}.json`,
  );
  mkdirSync(join("scripts", ".dry-run-cpm-contamination"), { recursive: true });
  const result = {
    appliedAt: new Date().toISOString(),
    host,
    backupPath,
    candidateCount: candidates.length,
    updated,
    noop,
    skipped,
    samplesAfter,
  };
  writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`APPLY done: updated=${updated} noop=${noop}`);
  console.log("samples:", samplesAfter);
  console.log("result:", resultPath);

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
