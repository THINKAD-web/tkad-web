#!/usr/bin/env npx tsx
/**
 * Phase 1b-4 — FactSheet.force_loop_sov=true execute (10건 allowlist).
 *
 * Usage:
 *   npx tsx scripts/execute-pr3-phase1b-override.mts              # dry-run
 *   npx tsx scripts/execute-pr3-phase1b-override.mts --execute --allow-prod
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  PHASE1B_EXECUTE_MEDIA_IDS,
  PHASE1B_DEFERRED_MEDIA_IDS,
} from "../lib/metrics/phase1b-min-ids.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

function dbHostLabel(url: string): string {
  return url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
}

async function main() {
  const execute = process.argv.includes("--execute");
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error("DATABASE_URL required (.env.vercel.production)");

  const host = dbHostLabel(dbUrl);
  if (host.includes("ep-holy-cloud") && execute && !process.argv.includes("--allow-prod")) {
    throw new Error("Production execute requires --allow-prod");
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(dbUrl),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { id: { in: [...PHASE1B_EXECUTE_MEDIA_IDS] } },
    select: {
      id: true,
      name: true,
      factSheet: { select: { id: true, forceLoopSov: true } },
    },
  });

  const missing = PHASE1B_EXECUTE_MEDIA_IDS.filter(
    (id) => !rows.some((r) => r.id === id),
  );
  if (missing.length) {
    throw new Error(`Missing media rows: ${missing.join(", ")}`);
  }

  const noFactSheet = rows.filter((r) => !r.factSheet?.id);
  if (noFactSheet.length) {
    throw new Error(
      `Missing FactSheet: ${noFactSheet.map((r) => r.id).join(", ")}`,
    );
  }

  const already = rows.filter((r) => r.factSheet?.forceLoopSov === true);
  const toUpdate = rows.filter((r) => r.factSheet?.forceLoopSov !== true);

  const log = {
    generatedAt: new Date().toISOString(),
    mode: execute ? "execute" : "dry-run",
    host,
    executeCount: PHASE1B_EXECUTE_MEDIA_IDS.length,
    deferredExcluded: [...PHASE1B_DEFERRED_MEDIA_IDS],
    alreadySet: already.map((r) => ({ id: r.id, name: r.name })),
    plannedUpdates: toUpdate.map((r) => ({
      id: r.id,
      name: r.name,
      factSheetId: r.factSheet!.id,
      before: r.factSheet!.forceLoopSov,
    })),
  };

  console.log(JSON.stringify(log, null, 2));

  if (!execute) {
    console.log("\n[dry-run] --execute --allow-prod 로 prod UPDATE");
    await db.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  for (const r of toUpdate) {
    await db.mediaFactSheet.update({
      where: { id: r.factSheet!.id },
      data: { forceLoopSov: true },
    });
    updated++;
  }

  const result = { ...log, updated };
  const out = resolve(root, "reports/pr3-phase1b-execute-production.json");
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\n✅ Updated ${updated} FactSheet rows → ${out}`);

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
