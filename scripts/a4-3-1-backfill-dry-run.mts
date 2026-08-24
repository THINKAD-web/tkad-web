#!/usr/bin/env npx tsx
/**
 * A-4 3-1 — seoul_gwanak backfill dry-run.
 * Run: npx tsx scripts/a4-3-1-backfill-dry-run.mts
 * Writes: reports/a4-3-1-backfill-dry-run.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

config({ path: ".env.local" });

type Row = {
  id: string;
  name: string;
  slug: string | null;
  district: string | null;
  region_sub: string | null;
  region_zone: string | null;
  region_main: string | null;
  location: string | null;
};

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: normalizePgDatabaseUrl(url), max: 3 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const prisma = createClient();
  try {
    const setA = await prisma.$queryRaw<Row[]>`
      SELECT id, name, slug, district, region_sub, region_zone, region_main, location
      FROM media
      WHERE is_active = true
        AND region_main = 'seoul'
        AND region_sub = 'seoul_guro'
        AND district ILIKE '%관악%'
      ORDER BY name
    `;

    const setB = await prisma.$queryRaw<Row[]>`
      SELECT id, name, slug, district, region_sub, region_zone, region_main, location
      FROM media
      WHERE is_active = true
        AND region_main = 'seoul'
        AND region_zone = 'gwanak'
        AND (region_sub IS NULL OR region_sub != 'seoul_gwanak')
      ORDER BY name
    `;

    const setC = await prisma.$queryRaw<Row[]>`
      SELECT id, name, slug, district, region_sub, region_zone, region_main, location
      FROM media
      WHERE is_active = true
        AND (
          name ILIKE '%서울대입구%'
          OR slug ILIKE '%seouldaeipgu%'
          OR slug ILIKE '%sinrimyeok%maekseu%'
        )
      ORDER BY name
    `;

    const tier1 = await prisma.$queryRaw<Row[]>`
      SELECT id, name, slug, district, region_sub, region_zone, region_main, location
      FROM media
      WHERE is_active = true
        AND region_main = 'seoul'
        AND district ILIKE '%관악%'
        AND (region_sub IS NULL OR region_sub != 'seoul_gwanak')
      ORDER BY name
    `;

    const idsA = new Set(setA.map((r) => r.id));
    const idsB = new Set(setB.map((r) => r.id));
    const idsC = new Set(setC.map((r) => r.id));
    const idsT1 = new Set(tier1.map((r) => r.id));

    const overlapAB = [...idsA].filter((id) => idsB.has(id));
    const aOnly = [...idsA].filter((id) => !idsB.has(id));
    const bOnly = [...idsB].filter((id) => !idsA.has(id));
    const cInTier1 = [...idsC].filter((id) => idsT1.has(id));
    const cNotTier1 = [...idsC].filter((id) => !idsT1.has(id));

    const slugFlags = setC
      .filter((r) => {
        const nameHasSeoulUniv = r.name.includes("서울대입구");
        const slugHasSinrim = (r.slug ?? "").includes("sinrimyeok");
        const slugHasSeoulUniv = (r.slug ?? "").includes("seouldaeipgu");
        const nameHasSadang = r.name.includes("사당");
        return (
          (nameHasSeoulUniv && slugHasSinrim) ||
          (nameHasSadang && slugHasSeoulUniv && !nameHasSeoulUniv)
        );
      })
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        note: "slug/name mismatch — manual review (not blocked on tier1 backfill)",
      }));

    const rollbackValues = tier1
      .map(
        (r) =>
          `  ('${r.id}', ${r.region_sub ? `'${r.region_sub}'` : "NULL"}, ${r.region_zone ? `'${r.region_zone}'` : "NULL"})`,
      )
      .join(",\n");

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        setA_guro_and_gwanak_district: setA.length,
        setB_gwanak_zone_misaligned_sub: setB.length,
        overlap_A_and_B: overlapAB.length,
        A_only_not_in_B: aOnly.length,
        B_only_not_in_A: bOnly.length,
        tier1_recommended_backfill: tier1.length,
        setC_seoul_univ_name_or_slug: setC.length,
        setC_in_tier1: cInTier1.length,
        setC_excluded_from_tier1: cNotTier1.length,
      },
      tier1BackfillTarget: tier1,
      setA,
      setB,
      setC,
      overlap: { A_intersect_B: overlapAB, A_only: aOnly, B_only: bOnly },
      setC_tier1_ids: cInTier1,
      setC_excluded: cNotTier1.map((id) => setC.find((r) => r.id === id)),
      slugManualReview: slugFlags,
      rollbackSql: `-- Rollback tier1 seoul_gwanak backfill (restore region_sub + region_zone)
-- Generated: ${new Date().toISOString()}
UPDATE media AS m
SET
  region_sub = v.region_sub,
  region_zone = v.region_zone
FROM (VALUES
${rollbackValues}
) AS v(id, region_sub, region_zone)
WHERE m.id = v.id;`,
      applySqlPreview: `-- Preview apply (tier1 only — run on Preview DB first)
UPDATE media
SET region_sub = 'seoul_gwanak'
WHERE is_active = true
  AND region_main = 'seoul'
  AND district ILIKE '%관악%'
  AND (region_sub IS NULL OR region_sub != 'seoul_gwanak');`,
    };

    const outJson = join(process.cwd(), "reports/a4-3-1-backfill-dry-run.json");
    mkdirSync(dirname(outJson), { recursive: true });
    writeFileSync(outJson, JSON.stringify(report, null, 2));

    console.log("=== A-4 3-1 Backfill Dry-Run ===\n");
    console.log("Set A (seoul_guro + district 관악):", setA.length);
    console.log("Set B (region_zone=gwanak, sub≠seoul_gwanak):", setB.length);
    console.log("  A∩B:", overlapAB.length, "| A only:", aOnly.length, "| B only:", bOnly.length);
    console.log("Tier 1 recommended backfill (district 관악):", tier1.length);
    console.log("\nTier 1 IDs:");
    for (const r of tier1) {
      console.log(`  ${r.id}  ${r.name}`);
      console.log(`    sub=${r.region_sub} zone=${r.region_zone} slug=${r.slug?.slice(0, 55)}`);
    }
    console.log("\nSet C (서울대입구 name/slug):", setC.length);
    console.log("  in tier1:", cInTier1.join(", ") || "(none)");
    if (cNotTier1.length) {
      console.log("  excluded from tier1:", cNotTier1.join(", "));
    }
    if (slugFlags.length) {
      console.log("\nSlug manual review:");
      for (const f of slugFlags) console.log(`  ${f.id}  ${f.note}`);
    }
    console.log(`\nWrote ${outJson}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
