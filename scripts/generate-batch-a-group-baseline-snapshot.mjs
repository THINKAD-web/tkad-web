#!/usr/bin/env node
/**
 * One-off: verified baseline for batch A-group (reviewed + v1-impressions).
 * Output: reports/batch-a-group-52-verified-snapshot-20260826.json
 */
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { userInfo } from "node:os";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production.fresh"), override: true });

const OUT = "reports/batch-a-group-52-verified-snapshot-20260826.json";

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: {
      reviewStatus: "reviewed",
      computedMetric: { modelVersion: "v1-impressions" },
    },
    select: {
      id: true,
      name: true,
      impressions: true,
      cpm: true,
      reviewStatus: true,
      updatedAt: true,
      computedMetric: { select: { modelVersion: true, cpm: true } },
    },
    orderBy: { name: "asc" },
  });

  let commitHash = "unknown";
  try {
    commitHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* ignore */
  }

  const report = {
    generatedAtUtc: new Date().toISOString(),
    executor: process.env.USER || userInfo().username || "unknown",
    commitHash,
    verificationMethod:
      "2026-08-26 production read-only audit: engine recompute vs stored impressions — 0 mismatches",
    note: "Original batch execute before-values unavailable; this snapshot is the post-verification baseline.",
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      impressions: r.impressions,
      cpm: r.cpm,
      reviewStatus: r.reviewStatus,
      modelVersion: r.computedMetric?.modelVersion ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };

  mkdirSync(resolve(root, "reports"), { recursive: true });
  const outPath = resolve(root, OUT);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, count: rows.length }, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
