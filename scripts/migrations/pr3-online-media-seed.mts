#!/usr/bin/env npx tsx
/**
 * PR3 — seed 23 online media rows + media_online_spec (Preview dry-run / execute / rollback).
 *
 * Usage:
 *   npx tsx scripts/migrations/pr3-online-media-seed.mts
 *   npx tsx scripts/migrations/pr3-online-media-seed.mts --execute
 *   npx tsx scripts/migrations/pr3-online-media-seed.mts --rollback --execute
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../../lib/normalize-pg-database-url.ts";
import { revalidateMediaCachesBulk } from "../../lib/media-cache-revalidate.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
config({ path: resolve(root, ".env.local"), override: true });

type SeedRow = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  location: string;
  locationEn?: string;
  region: string;
  catalogChannel: string;
  mediaMainCategory?: string;
  mediaSubCategory?: string;
  type: string | null;
  price: number | null;
  onlineSpec: {
    id: string;
    platform: string;
    minBudget: number;
    cpcMin?: number | null;
    cpcMax?: number | null;
    cpmMin?: number | null;
    cpmMax?: number | null;
    targetingOptions?: string[];
    strengths?: string[];
    kpiHints?: string[];
    bestFor?: string[];
  };
};

type SeedFile = {
  count: number;
  rows: SeedRow[];
};

function parseArgs() {
  return {
    execute: process.argv.includes("--execute"),
    rollback: process.argv.includes("--rollback"),
  };
}

function loadSeed(): SeedFile {
  const path = resolve(root, "prisma/seed-data/online-media-2026-09.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedFile;
}

async function main() {
  const { execute, rollback } = parseArgs();
  const seed = loadSeed();
  const ids = seed.rows.map((r) => r.id);
  const slugs = seed.rows.map((r) => r.slug);

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const existingBySlug = await db.media.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, catalogChannel: true },
  });
  const existingById = await db.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true },
  });

  const report = {
    mode: rollback ? "rollback" : "seed",
    execute,
    seedCount: seed.count,
    slugConflicts: existingBySlug.filter((r) => !ids.includes(r.id)),
    idPresent: existingById.length,
    ids,
    slugs,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!execute) {
    console.log("\nDry-run only — pass --execute to apply.");
    await pool.end();
    return;
  }

  if (rollback) {
    await db.$transaction(async (tx) => {
      await tx.mediaOnlineSpec.deleteMany({ where: { mediaId: { in: ids } } });
      await tx.media.deleteMany({ where: { id: { in: ids } } });
    });
    revalidateMediaCachesBulk(seed.rows.map((r) => ({ id: r.id, slug: r.slug })));
    console.log(`Rollback complete — removed ${ids.length} media rows.`);
    await pool.end();
    return;
  }

  if (report.slugConflicts.length > 0) {
    console.error("Slug conflicts — aborting:", report.slugConflicts);
    process.exit(1);
  }

  await db.$transaction(async (tx) => {
    for (const row of seed.rows) {
      await tx.media.create({
        data: {
          id: row.id,
          slug: row.slug,
          name: row.name,
          nameEn: row.nameEn ?? row.name,
          description: row.description,
          descriptionEn: row.descriptionEn,
          location: row.location,
          locationEn: row.locationEn ?? row.location,
          region: row.region,
          regionMain: "online",
          catalogChannel: row.catalogChannel,
          mediaMainCategory: row.mediaMainCategory,
          mediaSubCategory: row.mediaSubCategory,
          type: row.type,
          price: row.price,
          isActive: true,
          reviewStatus: "clean",
          onlineSpec: {
            create: {
              id: row.onlineSpec.id,
              platform: row.onlineSpec.platform,
              minBudget: row.onlineSpec.minBudget,
              cpcMin: row.onlineSpec.cpcMin ?? null,
              cpcMax: row.onlineSpec.cpcMax ?? null,
              cpmMin: row.onlineSpec.cpmMin ?? null,
              cpmMax: row.onlineSpec.cpmMax ?? null,
              targetingOptions: row.onlineSpec.targetingOptions ?? [],
              strengths: row.onlineSpec.strengths ?? [],
              kpiHints: row.onlineSpec.kpiHints ?? [],
              bestFor: row.onlineSpec.bestFor ?? [],
            },
          },
        },
      });
    }
  });

  revalidateMediaCachesBulk(seed.rows.map((r) => ({ id: r.id, slug: r.slug })));
  console.log(`Seed complete — inserted ${seed.rows.length} online media rows.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
