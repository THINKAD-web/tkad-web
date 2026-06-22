/**
 * Measure Media.targetAge DB coverage for planner age-matching decisions.
 *
 * Standalone ESM script — does not import lib/prisma.ts (uses require()).
 *
 * Usage:
 *   npx tsx scripts/measure-target-age-coverage.mts
 *
 * Or with explicit URL:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/measure-target-age-coverage.mts
 *
 * Loads .env → .env.local (same order as other scripts). Read-only.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!raw) return undefined;
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(raw)) {
    return undefined;
  }
  return raw;
}

function createReadOnlyPrisma(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. Add it to .env.local or pass inline.",
    );
  }
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function printDistribution(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw?.trim() ? raw.trim() : "(blank)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\n=== targetAge value distribution (filled rows) ===");
  const top = sorted.slice(0, 25);
  for (const [value, count] of top) {
    console.log(`  ${count.toString().padStart(5)}  ${value}`);
  }
  if (sorted.length > top.length) {
    console.log(`  … and ${sorted.length - top.length} more distinct values`);
  }
  console.log(`Distinct values: ${sorted.length}`);
}

async function main() {
  const prisma = createReadOnlyPrisma();

  try {
    const total = await prisma.media.count({
      where: { isActive: true },
    });

    const withTargetAge = await prisma.media.count({
      where: {
        isActive: true,
        AND: [{ targetAge: { not: null } }, { NOT: { targetAge: "" } }],
      },
    });

    const filledRows = await prisma.media.findMany({
      where: {
        isActive: true,
        AND: [{ targetAge: { not: null } }, { NOT: { targetAge: "" } }],
      },
      select: { targetAge: true },
    });

    const pct = total > 0 ? (withTargetAge / total) * 100 : 0;

    console.log("=== Media.targetAge coverage (active media) ===");
    console.log(`Total active: ${total}`);
    console.log(`With targetAge: ${withTargetAge}`);
    console.log(`Coverage: ${pct.toFixed(1)}%`);
    printDistribution(filledRows.map((r) => r.targetAge));
    console.log(
      pct >= 40
        ? "\nRecommendation: coverage is moderate/high — age matching may be viable in a follow-up."
        : "\nRecommendation: coverage is low — defer targetAge matching (Phase 2-a).",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
