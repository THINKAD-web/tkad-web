#!/usr/bin/env npx tsx
/**
 * regionMain=national 매체 — legacy region/regionZone 불일치 일괄 정정.
 *
 * Usage:
 *   npx tsx scripts/execute-national-region-legacy-fix.mts              # dry-run
 *   npx tsx scripts/execute-national-region-legacy-fix.mts --execute  # apply
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });

const TAXI_MEDIABAR_ID = "cmp3v7v99000204l1gdoodg2q";
const TAXI_LOCATION =
  "서울·경기·부산·포항·제주 전역 택시 노선";

type PlannedChange = {
  id: string;
  name: string;
  changes: Record<string, { from: unknown; to: unknown }>;
};

function planChange(row: {
  id: string;
  name: string;
  region: string | null;
  regionZone: string | null;
  location: string | null;
}): PlannedChange | null {
  const changes: PlannedChange["changes"] = {};
  const legacy = (row.region ?? "").trim().toLowerCase();

  if (legacy !== "national") {
    changes.region = { from: row.region, to: "national" };
  }
  if (row.regionZone) {
    changes.regionZone = { from: row.regionZone, to: null };
  }
  if (row.id === TAXI_MEDIABAR_ID && row.location !== TAXI_LOCATION) {
    changes.location = { from: row.location, to: TAXI_LOCATION };
  }

  if (Object.keys(changes).length === 0) return null;
  return { id: row.id, name: row.name, changes };
}

function dbHostLabel(url: string): string {
  return url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
}

async function main() {
  const execute = process.argv.includes("--execute");
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error("DATABASE_URL required (.env.local)");

  const host = dbHostLabel(dbUrl);
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(dbUrl),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true, regionMain: "national" },
    select: {
      id: true,
      name: true,
      region: true,
      regionZone: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });

  const planned = rows.map(planChange).filter(Boolean) as PlannedChange[];

  const report = {
    generatedAt: new Date().toISOString(),
    mode: execute ? "execute" : "dry-run",
    host,
    scannedNationalActive: rows.length,
    plannedCount: planned.length,
    planned,
  };

  const outPath = resolve(root, "reports/national-region-legacy-fix.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  if (!execute) {
    console.log(`[dry-run] ${planned.length} media planned — ${outPath}`);
    for (const p of planned) {
      console.log(`- ${p.name} (${p.id})`);
      for (const [k, v] of Object.entries(p.changes)) {
        console.log(`    ${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`);
      }
    }
    await db.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  for (const p of planned) {
    const data: Record<string, unknown> = {};
    if ("region" in p.changes) data.region = "national";
    if ("regionZone" in p.changes) data.regionZone = null;
    if ("location" in p.changes) data.location = TAXI_LOCATION;
    await db.media.update({ where: { id: p.id }, data });
    updated += 1;
  }

  const verifyIds = [
    TAXI_MEDIABAR_ID,
    "cmptklfa7000104jxmftxlrt7",
    "cms40wyaq000t04l7scpmikbg",
    "cms4x6xqo000004jr9umgjtmf",
    "cms4xck8e000g04ldltcj34al",
  ];
  const verified = await db.media.findMany({
    where: { id: { in: verifyIds } },
    select: { id: true, name: true, region: true, regionZone: true, location: true },
  });

  console.log(`[execute] updated ${updated} media — ${outPath}`);
  console.log(JSON.stringify({ verified }, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
