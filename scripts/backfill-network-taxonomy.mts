/**
 * Backfill MediaNetwork taxonomy columns from existing type/tags/locations.
 *
 * Standalone ESM — does not import lib/prisma.ts (Prisma 7 requires adapter).
 *
 * Usage:
 *   npx tsx scripts/backfill-network-taxonomy.mts           # dry-run (read only)
 *   npx tsx scripts/backfill-network-taxonomy.mts --apply   # write updates
 *
 * Or with explicit URL:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-network-taxonomy.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { resolveNetworkCatalogType } from "../lib/media-network-types.ts";
import {
  networkTaxonomyToPatch,
  networkTaxonomyFromRow,
  resolveNetworkTaxonomyLabels,
} from "../lib/network-taxonomy.ts";
import { resolveBrowseRegionIds } from "../lib/network-location-enrich.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

const apply = process.argv.includes("--apply");

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

function createPrisma(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. Add it to .env.local or pass inline.",
    );
  }
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: apply ? 3 : 2,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const db = createPrisma();

  try {
    const rows = await db.mediaNetwork.findMany({
      include: {
        locations: {
          select: {
            regionMain: true,
            regionSub: true,
            address: true,
            fullAddress: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    console.log(
      `Found ${rows.length} network(s). Mode: ${apply ? "APPLY" : "dry-run"}\n`,
    );

    for (const row of rows) {
      let regionMain = row.regionMain?.trim() ?? "";
      let regionSub = row.regionSub?.trim() ?? "";
      if (!regionMain) {
        for (const loc of row.locations) {
          const resolved = resolveBrowseRegionIds({
            regionMain: loc.regionMain,
            regionSub: loc.regionSub,
            address: loc.fullAddress ?? loc.address,
          });
          if (resolved.regionMain) {
            regionMain = resolved.regionMain;
            regionSub = resolved.regionSub ?? "";
            break;
          }
        }
      }
      if (!regionMain && row.regions[0]) {
        const resolved = resolveBrowseRegionIds({ address: row.regions[0] });
        regionMain = resolved.regionMain ?? "";
        regionSub = resolved.regionSub ?? "";
      }

      const venueForCatalog = networkTaxonomyFromRow({
        ...row,
        regionMain: regionMain || null,
        regionSub: regionSub || null,
      }).venueCode;
      const catalogType = resolveNetworkCatalogType(venueForCatalog || row.type);
      const normalizedType =
        row.type === "digital" ||
        row.type === "static" ||
        row.type === "mobile"
          ? row.type
          : catalogType;

      const form = networkTaxonomyFromRow({
        ...row,
        type: normalizedType,
        regionMain: regionMain || null,
        regionSub: regionSub || null,
      });

      const patch = networkTaxonomyToPatch(form, row.tags);
      const labels = resolveNetworkTaxonomyLabels(
        {
          type: patch.type,
          tags: patch.tags,
          venueType: patch.venueType,
          mediaMainCategory: patch.mediaMainCategory,
          mediaSubCategory: patch.mediaSubCategory,
          regionMain: patch.regionMain,
          regionSub: patch.regionSub,
          targetCategory: patch.targetCategory,
          name: row.name,
        },
        "ko",
      );

      console.log(`— ${row.name} (${row.id})`);
      console.log(`  catalog type: ${row.type} → ${patch.type}`);
      console.log(
        `  venue: ${patch.venueType ?? "(none)"}${labels.venueLabel ? ` (${labels.venueLabel})` : ""}`,
      );
      console.log(
        `  browse: ${patch.mediaMainCategory ?? "—"} / ${patch.mediaSubCategory ?? "—"}`,
      );
      if (labels.browseLabel) {
        console.log(`  browse (label): ${labels.browseLabel}`);
      }
      console.log(
        `  region: ${patch.regionMain ?? "—"} / ${patch.regionSub ?? "—"}`,
      );
      if (labels.regionLabel) {
        console.log(`  region (label): ${labels.regionLabel}`);
      }
      console.log(
        `  targets: ${patch.targetCategory.join(", ") || "(none)"}${
          labels.targetLabels.length > 0
            ? ` (${labels.targetLabels.join(", ")})`
            : ""
        }`,
      );
      console.log(`  tags: ${patch.tags.join(", ") || "(none)"}`);

      if (apply) {
        await db.mediaNetwork.update({
          where: { id: row.id },
          data: {
            type: patch.type,
            venueType: patch.venueType,
            mediaMainCategory: patch.mediaMainCategory,
            mediaSubCategory: patch.mediaSubCategory,
            regionMain: patch.regionMain,
            regionSub: patch.regionSub,
            targetCategory: patch.targetCategory,
            tags: patch.tags,
          },
        });
        console.log("  ✓ applied");
      }
      console.log("");
    }

    if (!apply) {
      console.log("Dry-run complete. Re-run with --apply to write.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
