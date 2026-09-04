#!/usr/bin/env npx tsx
/**
 * PR5-d Phase 1 — online media content-only update from seed JSON.
 * Updates description/strengths/bestFor/kpiHints only. Pricing fields must be unchanged.
 *
 * Usage:
 *   npx tsx scripts/migrations/pr5-d-online-content-update.mts
 *   npx tsx scripts/migrations/pr5-d-online-content-update.mts --preview --execute
 *   npx tsx scripts/migrations/pr5-d-online-content-update.mts --prod --execute
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

type SeedRow = {
  id: string;
  slug: string;
  description?: string;
  descriptionEn?: string;
  onlineSpec: {
    id: string;
    minBudget: number;
    cpcMin?: number | null;
    cpcMax?: number | null;
    cpmMin?: number | null;
    cpmMax?: number | null;
    strengths?: string[];
    kpiHints?: string[];
    bestFor?: string[];
  };
};

type SeedFile = { rows: SeedRow[] };

function parseArgs() {
  const execute = process.argv.includes("--execute");
  const prod = process.argv.includes("--prod");
  const preview = process.argv.includes("--preview") || (!prod && execute);
  return { execute, prod, preview };
}

function loadSeed(): SeedFile {
  const path = resolve(root, "prisma/seed-data/online-media-2026-09.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedFile;
}

function pricingFingerprint(spec: SeedRow["onlineSpec"]) {
  return {
    minBudget: spec.minBudget,
    cpcMin: spec.cpcMin ?? null,
    cpcMax: spec.cpcMax ?? null,
    cpmMin: spec.cpmMin ?? null,
    cpmMax: spec.cpmMax ?? null,
  };
}

function isCalculable(spec: {
  cpcMin: number | null;
  cpcMax: number | null;
  cpmMin: number | null;
  cpmMax: number | null;
}) {
  return hasOnlinePricingSpec(spec);
}

async function main() {
  const { execute, prod, preview } = parseArgs();
  config({
    path: resolve(
      root,
      prod ? ".env.production.local" : preview ? ".env.preview.local" : ".env.local",
    ),
    override: true,
  });
  config({ path: resolve(root, ".env.local"), override: false });

  const seed = loadSeed();
  const slugs = seed.rows.map((r) => r.slug);

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const existing = await db.media.findMany({
    where: { slug: { in: slugs }, catalogChannel: "online" },
    include: { onlineSpec: true },
  });
  const bySlug = new Map(existing.map((r) => [r.slug!, r]));

  const diffs: Array<Record<string, unknown>> = [];
  const classificationBefore: Record<string, "calculable" | "inquiry"> = {};
  const classificationAfter: Record<string, "calculable" | "inquiry"> = {};

  for (const row of seed.rows) {
    const cur = bySlug.get(row.slug);
    if (!cur?.onlineSpec) {
      diffs.push({ slug: row.slug, error: "missing in DB" });
      continue;
    }

    const beforeSpec = cur.onlineSpec;
    classificationBefore[row.slug] = isCalculable(beforeSpec) ? "calculable" : "inquiry";
    classificationAfter[row.slug] = isCalculable(row.onlineSpec) ? "calculable" : "inquiry";

    const beforeFp = pricingFingerprint(beforeSpec);
    const afterFp = pricingFingerprint(row.onlineSpec);
    if (JSON.stringify(beforeFp) !== JSON.stringify(afterFp)) {
      diffs.push({
        slug: row.slug,
        error: "PRICING FIELD MISMATCH — abort",
        before: beforeFp,
        after: afterFp,
      });
      continue;
    }

    if (classificationBefore[row.slug] !== classificationAfter[row.slug]) {
      diffs.push({
        slug: row.slug,
        error: "CLASSIFICATION CHANGE — abort",
        before: classificationBefore[row.slug],
        after: classificationAfter[row.slug],
      });
      continue;
    }

    const contentDiff: Record<string, { before: unknown; after: unknown }> = {};
    if ((cur.description ?? "") !== (row.description ?? "")) {
      contentDiff.description = { before: cur.description, after: row.description };
    }
    if ((cur.descriptionEn ?? "") !== (row.descriptionEn ?? "")) {
      contentDiff.descriptionEn = { before: cur.descriptionEn, after: row.descriptionEn };
    }
    for (const field of ["strengths", "kpiHints", "bestFor"] as const) {
      const b = beforeSpec[field] ?? [];
      const a = row.onlineSpec[field] ?? [];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        contentDiff[field] = { before: b, after: a };
      }
    }

    if (Object.keys(contentDiff).length > 0) {
      diffs.push({ slug: row.slug, classification: classificationBefore[row.slug], ...contentDiff });
    }
  }

  const calculableBefore = Object.values(classificationBefore).filter((v) => v === "calculable").length;
  const inquiryBefore = Object.values(classificationBefore).filter((v) => v === "inquiry").length;
  const errors = diffs.filter((d) => "error" in d);
  const contentChanges = diffs.filter((d) => !("error" in d));

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        env: prod ? "prod" : preview ? "preview" : "local",
        seedRows: seed.rows.length,
        dbRows: existing.length,
        classification: {
          before: { calculable: calculableBefore, inquiry: inquiryBefore },
          after: {
            calculable: Object.values(classificationAfter).filter((v) => v === "calculable").length,
            inquiry: Object.values(classificationAfter).filter((v) => v === "inquiry").length,
          },
          unchanged: errors.length === 0 && calculableBefore === 14 && inquiryBefore === 9,
        },
        contentChangeCount: contentChanges.length,
        errors: errors.length,
        diffs: contentChanges,
      },
      null,
      2,
    ),
  );

  if (errors.length > 0) {
    console.error("\nERRORS:", JSON.stringify(errors, null, 2));
    await pool.end();
    process.exit(1);
  }

  if (!execute) {
    console.log("\nDry-run only — pass --execute to apply.");
    await pool.end();
    return;
  }

  await db.$transaction(
    async (tx) => {
      for (const row of seed.rows) {
        const cur = bySlug.get(row.slug);
        if (!cur?.onlineSpec) continue;
        await tx.media.update({
          where: { id: cur.id },
          data: {
            description: row.description,
            descriptionEn: row.descriptionEn,
          },
        });
        await tx.mediaOnlineSpec.update({
          where: { id: cur.onlineSpec.id },
          data: {
            strengths: row.onlineSpec.strengths ?? [],
            kpiHints: row.onlineSpec.kpiHints ?? [],
            bestFor: row.onlineSpec.bestFor ?? [],
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  revalidateMediaCachesBulk(seed.rows.map((r) => ({ id: r.id, slug: r.slug })));
  console.log(`\nApplied content updates for ${seed.rows.length} online media rows.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
