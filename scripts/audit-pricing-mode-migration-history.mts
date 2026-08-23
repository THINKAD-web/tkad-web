#!/usr/bin/env npx tsx
/**
 * pricing_mode 마이그레이션 적용 이력 — production vs preview DB 비교.
 * Usage: npx tsx scripts/audit-pricing-mode-migration-history.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function dbFingerprint(url: string) {
  const u = new URL(url.replace(/^postgresql:/, "postgres:"));
  return {
    host: u.hostname,
    database: u.pathname.replace(/^\//, ""),
    user: u.username,
  };
}

async function auditEnv(envName: string, envFile: string) {
  config({ path: resolve(root, ".env") });
  config({ path: resolve(root, envFile), override: true });
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) return { envName, error: "DATABASE_URL missing" as const };

  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const pricingMigrations = await db.$queryRaw<
      {
        migration_name: string;
        finished_at: Date | null;
        applied_steps_count: number;
        checksum: string;
      }[]
    >`
      SELECT migration_name, finished_at, applied_steps_count, checksum
      FROM _prisma_migrations
      WHERE migration_name LIKE '%pricing_mode%'
      ORDER BY finished_at ASC NULLS LAST
    `;

    const recentMigrations = await db.$queryRaw<
      { migration_name: string; finished_at: Date | null }[]
    >`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC
      LIMIT 10
    `;

    const wall = await db.$queryRaw<{ mode: string; n: number }[]>`
      SELECT pricing_mode::text AS mode, COUNT(*)::int AS n
      FROM media
      WHERE is_active = true AND media_sub_category = 'wall_mural'
      GROUP BY pricing_mode
      ORDER BY mode
    `;

    const pricedBad = await db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM media
      WHERE is_active = true
        AND media_sub_category = 'wall_mural'
        AND pricing_mode = 'quote_only'
        AND COALESCE(price, 0) > 0
    `;

    const columnExists = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'media'
          AND column_name = 'pricing_mode'
      ) AS exists
    `;

    return {
      envName,
      connection: dbFingerprint(url),
      hasPricingModeColumn: columnExists[0]?.exists === true,
      pricingModeMigrations: pricingMigrations.map((m) => ({
        migration_name: m.migration_name,
        finished_at: m.finished_at?.toISOString() ?? null,
        applied_steps_count: m.applied_steps_count,
        checksum: m.checksum,
      })),
      recentMigrations: recentMigrations.map((m) => ({
        migration_name: m.migration_name,
        finished_at: m.finished_at?.toISOString() ?? null,
      })),
      wallMuralByMode: wall,
      pricedWallMarkedQuoteOnly: pricedBad[0]?.n ?? 0,
    };
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

const production = await auditEnv("production", ".env.production.local");
const preview = await auditEnv("preview", ".env.preview.local");

const finalReport = {
  generatedAt: new Date().toISOString(),
  sameDatabaseHost: production.connection?.host === preview.connection?.host,
  production,
  preview,
};

const outDir = resolve(root, "reports");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(
  outDir,
  `pricing-mode-migration-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
writeFileSync(outPath, JSON.stringify(finalReport, null, 2), "utf8");
console.log(JSON.stringify(finalReport, null, 2));
console.log("\nsaved:", outPath);
