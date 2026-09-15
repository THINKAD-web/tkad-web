/**
 * 레거시 region=seoul 등 browse regionMain과 불일치하는 Media.region 보정.
 *
 * Dry-run: npx tsx scripts/backfill-media-legacy-region.mts
 * Apply:    npx tsx scripts/backfill-media-legacy-region.mts --apply
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import type { MediaRegionMacro } from "../lib/media-regions.ts";

config({ path: resolve(".env") });
config({ path: resolve(".env.local"), override: true });

const apply = process.argv.includes("--apply");

function legacyRegionFromMain(main: string): MediaRegionMacro {
  if (main === "seoul") return "seoul";
  if (main === "busan") return "busan";
  if (main === "jeju") return "jeju";
  return "national";
}

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: {
      isActive: true,
      regionMain: { not: null },
      NOT: { regionMain: "" },
    },
    select: {
      id: true,
      name: true,
      region: true,
      regionMain: true,
      regionSub: true,
      city: true,
      district: true,
    },
  });

  const targets = rows.filter((r) => {
    const main = r.regionMain?.trim();
    if (!main) return false;
    const expected = legacyRegionFromMain(main);
    const legacy = (r.region ?? "").trim().toLowerCase();
    return legacy !== expected;
  });

  const nationalMacroRegional = rows.filter((r) => {
    const legacy = (r.region ?? "").trim().toLowerCase();
    const main = r.regionMain?.trim();
    return legacy === "national" && !!main && main !== "national";
  });

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        activeWithRegionMain: rows.length,
        correctionTargets: targets.length,
        nationalMacroWithRegionalMain: nationalMacroRegional.length,
        nationalMacroSample: nationalMacroRegional.slice(0, 10).map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region,
          regionMain: r.regionMain,
          note: "매칭·표시는 regionMain 우선 정책으로 처리 (legacy region=national 유지)",
        })),
        sample: targets.slice(0, 15).map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city,
          region: r.region,
          regionMain: r.regionMain,
          regionSub: r.regionSub,
          nextRegion: legacyRegionFromMain(r.regionMain!.trim()),
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("\nDry-run only. Pass --apply to update.");
    await db.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  for (const row of targets) {
    const main = row.regionMain!.trim();
    const nextRegion = legacyRegionFromMain(main);
    await db.media.update({
      where: { id: row.id },
      data: { region: nextRegion },
    });
    updated += 1;
  }

  console.log(`\nApplied ${updated} updates.`);
  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
