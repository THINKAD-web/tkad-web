/**
 * Phase A2 — Backfill safe month aliases in priceOptions[].period → "month".
 *
 * Safe aliases only: "1개월" | "월" | "monthly" (case-insensitive for monthly).
 * Does NOT touch 2주/N일/2개월/시즌 etc. (Phase B).
 *
 * Usage:
 *   node --import tsx scripts/backfill-month-period-aliases.mjs           # dry-run
 *   APPLY_MONTH_PERIOD_BACKFILL=1 CONFIRM_DB_HOST=<neon-host> \
 *     node --import tsx scripts/backfill-month-period-aliases.mjs       # apply
 *
 * Always writes backup under scripts/.backups/ before apply updates.
 * Verifies display price (resolveMediaDisplayPrice) diff-0 for touched rows.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const {
  isSafeMonthPeriodAlias,
  SAFE_MONTH_PERIOD_ALIASES,
} = await import("../lib/media-price-period-write.ts");
const { resolveMediaDisplayPrice } = await import("../lib/media-price-format.ts");

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim();

const apply = process.env.APPLY_MONTH_PERIOD_BACKFILL === "1";
const confirmHost = (process.env.CONFIRM_DB_HOST ?? "").trim();

function hostFromUrl(url) {
  return url?.match(/@([^/?]+)/)?.[1] ?? "";
}

function rewriteOptions(priceOptions) {
  if (!Array.isArray(priceOptions)) return { changed: false, next: priceOptions, hits: [] };
  let changed = false;
  const hits = [];
  const next = priceOptions.map((row, i) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const period = row.period;
    if (typeof period !== "string" || !isSafeMonthPeriodAlias(period)) {
      return row;
    }
    changed = true;
    hits.push({ index: i, from: period, label: row.label, price: row.price });
    return { ...row, period: "month" };
  });
  return { changed, next, hits };
}

async function main() {
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const host = hostFromUrl(databaseUrl);
  console.log(`DB host: ${host}`);
  console.log(`mode: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`safe aliases: ${SAFE_MONTH_PERIOD_ALIASES.join(", ")}`);

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

  const pool = new Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { priceOptions: { not: null } },
    select: {
      id: true,
      name: true,
      price: true,
      pricePeriod: true,
      priceOptions: true,
      priceNote: true,
      description: true,
    },
  });

  const plans = [];
  let displayDiffs = 0;

  for (const row of rows) {
    const { changed, next, hits } = rewriteOptions(row.priceOptions);
    if (!changed) continue;

    const beforeMedia = {
      price: row.price,
      pricePeriod: row.pricePeriod,
      priceOptions: row.priceOptions,
    };
    const afterMedia = {
      price: row.price,
      pricePeriod: row.pricePeriod,
      priceOptions: next,
    };
    const beforeDisplay = resolveMediaDisplayPrice(beforeMedia);
    const afterDisplay = resolveMediaDisplayPrice(afterMedia);
    const displayEqual =
      beforeDisplay.priceWon === afterDisplay.priceWon &&
      beforeDisplay.period === afterDisplay.period;
    if (!displayEqual) displayDiffs++;

    plans.push({
      id: row.id,
      name: row.name,
      hits,
      beforeDisplay,
      afterDisplay,
      displayEqual,
      beforeOptions: row.priceOptions,
      afterOptions: next,
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join("scripts", ".backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `month-period-alias-backfill-${stamp}.json`,
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: apply ? "APPLY" : "DRY-RUN",
        host,
        safeAliases: [...SAFE_MONTH_PERIOD_ALIASES],
        mediaCount: plans.length,
        optionHitCount: plans.reduce((s, p) => s + p.hits.length, 0),
        displayDiffs,
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          hits: p.hits,
          beforeDisplay: p.beforeDisplay,
          afterDisplay: p.afterDisplay,
          displayEqual: p.displayEqual,
          beforeOptions: p.beforeOptions,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`backup: ${backupPath}`);
  console.log(
    JSON.stringify(
      {
        mediaToUpdate: plans.length,
        optionHits: plans.reduce((s, p) => s + p.hits.length, 0),
        displayDiffs,
        displayDiff0: displayDiffs === 0,
      },
      null,
      2,
    ),
  );

  if (displayDiffs > 0) {
    console.error("ABORT: display price would change for some rows — not safe alias-only.");
    process.exit(1);
  }

  if (!apply) {
    console.log("Dry-run complete. Re-run with APPLY_MONTH_PERIOD_BACKFILL=1 to write.");
    await db.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  for (const p of plans) {
    await db.media.update({
      where: { id: p.id },
      data: { priceOptions: p.afterOptions },
    });
    updated++;
  }

  console.log(`updated ${updated} media rows`);
  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
