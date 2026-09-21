/**
 * engagementRate ≈0.65 placeholder — 근거(출처·측정) 없으면 null.
 *
 *   npx tsx scripts/sanitize-engagement-rate-placeholder.mts
 *   npx tsx scripts/sanitize-engagement-rate-placeholder.mts --apply --confirm-prod
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { decidePlaceholderEngagementRate } from "../lib/engagement-rate-trust.ts";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { assertScriptDatabaseAccess } from "./lib/script-db-guard.mts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const apply = process.argv.includes("--apply");

async function main() {
  const dbCtx = assertScriptDatabaseAccess({
    scriptName: "sanitize-engagement-rate-placeholder.mts",
  });

  const url = normalizePgDatabaseUrl(dbCtx.databaseUrl);
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true, engagementRate: { not: null } },
    select: {
      id: true,
      slug: true,
      name: true,
      engagementRate: true,
      description: true,
      effectMemo: true,
    },
  });

  const plan = [];
  for (const row of rows) {
    const decision = decidePlaceholderEngagementRate({
      engagementRate: row.engagementRate,
      description: row.description,
      effectMemo: row.effectMemo,
    });
    if (!decision.clearRate) continue;

    plan.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      engagementRate: row.engagementRate,
      reason: decision.reason,
    });

    if (apply) {
      await db.media.update({
        where: { id: row.id },
        data: { engagementRate: null },
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    apply,
    dbTarget: dbCtx.target,
    hostname: dbCtx.hostname,
    rowsScanned: rows.length,
    toClear: plan.length,
    plan,
  };

  const out = resolve(root, "reports/engagement-rate-placeholder-sanitize.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
