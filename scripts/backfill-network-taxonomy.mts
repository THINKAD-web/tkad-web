/**
 * Backfill MediaNetwork taxonomy columns from existing type/tags/locations.
 *
 * Usage:
 *   npx tsx scripts/backfill-network-taxonomy.mts           # dry-run (read only)
 *   npx tsx scripts/backfill-network-taxonomy.mts --apply   # write updates
 */
import { PrismaClient } from "@prisma/client";
import { resolveNetworkCatalogType } from "../lib/media-network-types.ts";
import {
  inferNetworkBrowseDefaults,
  networkTaxonomyToPatch,
  networkTaxonomyFromRow,
  parseTargetSlugsFromTags,
  resolveNetworkVenueCodeFromRow,
} from "../lib/network-taxonomy.ts";
import { resolveBrowseRegionIds } from "../lib/network-location-enrich.ts";

const apply = process.argv.includes("--apply");

async function main() {
  const db = new PrismaClient();
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

  console.log(`Found ${rows.length} network(s). Mode: ${apply ? "APPLY" : "dry-run"}\n`);

  for (const row of rows) {
    const venueCode = resolveNetworkVenueCodeFromRow(row);
    const catalogType = resolveNetworkCatalogType(
      venueCode ?? row.type,
    );
    const normalizedType =
      row.type === "digital" ||
      row.type === "static" ||
      row.type === "mobile"
        ? row.type
        : catalogType;

    const browseDefaults = inferNetworkBrowseDefaults({
      catalogType: normalizedType,
      venueCode,
      name: row.name,
      description: row.description,
      tags: row.tags,
    });

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

    const targetFromTags = parseTargetSlugsFromTags(row.tags);
    const form = networkTaxonomyFromRow({
      ...row,
      type: normalizedType,
      venueType: venueCode,
      mediaMainCategory: row.mediaMainCategory ?? browseDefaults.main,
      mediaSubCategory: row.mediaSubCategory ?? browseDefaults.sub,
      regionMain: regionMain || null,
      regionSub: regionSub || null,
      targetCategory:
        row.targetCategory.length > 0 ? row.targetCategory : targetFromTags,
    });

    const patch = networkTaxonomyToPatch(form, row.tags);

    console.log(`— ${row.name} (${row.id})`);
    console.log(`  type: ${row.type} → ${patch.type}`);
    console.log(`  venue: ${patch.venueType ?? "(none)"}`);
    console.log(
      `  browse: ${patch.mediaMainCategory ?? "—"} / ${patch.mediaSubCategory ?? "—"}`,
    );
    console.log(
      `  region: ${patch.regionMain ?? "—"} / ${patch.regionSub ?? "—"}`,
    );
    console.log(`  targets: ${patch.targetCategory.join(", ") || "(none)"}`);
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

  await db.$disconnect();
  if (!apply) {
    console.log("Dry-run complete. Re-run with --apply to write.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
