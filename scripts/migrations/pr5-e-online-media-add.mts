#!/usr/bin/env npx tsx
/**
 * PR5-e — add new online media rows from seed JSON (incremental insert only).
 *
 * Usage:
 *   npx tsx scripts/migrations/pr5-e-online-media-add.mts
 *   npx tsx scripts/migrations/pr5-e-online-media-add.mts --preview --execute
 *   npx tsx scripts/migrations/pr5-e-online-media-add.mts --prod --execute
 *   npx tsx scripts/migrations/pr5-e-online-media-add.mts --prod --rollback --execute
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../../lib/normalize-pg-database-url.ts";
import { hasOnlinePricingSpec } from "../../lib/pricing/online-performance-estimate.ts";
import { revalidateMediaCachesBulk } from "../../lib/media-cache-revalidate.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** PR5-e incremental slugs — SSOT for rollback. */
export const PR5E_NEW_SLUGS = ["naver-brand-search", "coupang-ad-traffic"] as const;

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
    prod: process.argv.includes("--prod"),
    preview: process.argv.includes("--preview") || (process.argv.includes("--execute") && !process.argv.includes("--prod")),
  };
}

function loadSeed(): SeedFile {
  const path = resolve(root, "prisma/seed-data/online-media-2026-09.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedFile;
}

function pickNewRows(seed: SeedFile): SeedRow[] {
  const slugSet = new Set<string>(PR5E_NEW_SLUGS);
  const rows = seed.rows.filter((r) => slugSet.has(r.slug));
  if (rows.length !== PR5E_NEW_SLUGS.length) {
    throw new Error(`Expected ${PR5E_NEW_SLUGS.length} PR5-e rows in seed, got ${rows.length}`);
  }
  return rows;
}

async function main() {
  const { execute, rollback, prod, preview } = parseArgs();
  const seed = loadSeed();
  const newRows = pickNewRows(seed);
  const ids = newRows.map((r) => r.id);
  const slugs = newRows.map((r) => r.slug);

  config({
    path: resolve(
      root,
      prod ? ".env.production.local" : preview ? ".env.preview.local" : ".env.local",
    ),
    override: true,
  });
  config({ path: resolve(root, ".env.local"), override: false });

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const existingBySlug = await db.media.findMany({
    where: { slug: { in: [...slugs] } },
    select: { id: true, slug: true, catalogChannel: true },
  });

  const calculable = newRows.filter((r) => hasOnlinePricingSpec(r.onlineSpec)).length;
  const inquiry = newRows.length - calculable;

  const report = {
    mode: rollback ? "rollback" : "add",
    execute,
    env: prod ? "prod" : preview ? "preview" : "local",
    seedCount: seed.count,
    newSlugs: slugs,
    newIds: ids,
    existingBySlug,
    toInsert: rollback ? [] : newRows.filter((r) => !existingBySlug.some((e) => e.slug === r.slug)),
    classification: { calculable, inquiry, total: newRows.length },
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
    revalidateMediaCachesBulk(newRows.map((r) => ({ id: r.id, slug: r.slug })));
    console.log(`Rollback complete — removed ${ids.length} PR5-e media rows.`);
    await pool.end();
    return;
  }

  const conflicts = existingBySlug.filter((r) => !ids.includes(r.id));
  if (conflicts.length > 0) {
    console.error("Slug conflicts with different ids — aborting:", conflicts);
    process.exit(1);
  }

  if (report.toInsert.length === 0) {
    console.log("All PR5-e rows already present — no-op.");
    await pool.end();
    return;
  }

  await db.$transaction(
    async (tx) => {
      for (const row of report.toInsert) {
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
          },
        });
        await tx.mediaOnlineSpec.create({
          data: {
            id: row.onlineSpec.id,
            mediaId: row.id,
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
        });
      }
    },
    { timeout: 120_000 },
  );

  revalidateMediaCachesBulk(
    report.toInsert.map((r) => ({ id: r.id, slug: r.slug })),
  );
  console.log(`Insert complete — added ${report.toInsert.length} online media rows.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
