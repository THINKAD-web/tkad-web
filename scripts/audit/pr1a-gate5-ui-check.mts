#!/usr/bin/env node
/**
 * PR1a Gate 5 step 4 — list/filter smoke while catalog_channel all NULL.
 * Uses pg (no getPrisma) + client-side filter helper.
 */
import pg from "pg";
import { filterMediaByDiscoveryChips } from "../../lib/media-discovery-client-filter.ts";
import type { MediaItem } from "../../lib/media-data.ts";

function rowToMediaItem(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    mediaMainCategory: (row.media_main_category as string | null) ?? undefined,
    mediaSubCategory: (row.media_sub_category as string | null) ?? undefined,
    subCategory: (row.sub_category as string | null) ?? undefined,
    region: String(row.region ?? ""),
    location: String(row.location ?? ""),
    price: Number(row.price ?? 0),
    tags: [],
  } as MediaItem;
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const counts = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE catalog_channel IS NULL)::int AS null_channel,
        COUNT(*) FILTER (WHERE catalog_channel IS NOT NULL)::int AS set_channel,
        COUNT(*) FILTER (WHERE is_active IS NOT FALSE AND country = 'KR')::int AS active_kr
      FROM media
    `);
    const cs = counts.rows[0];
    console.info("[gate5-ui] counts", cs);

    const { rows } = await client.query(`
      SELECT id, name, type, region, location, price,
             media_main_category, media_sub_category, sub_category
      FROM media
      WHERE is_active IS NOT FALSE AND country = 'KR'
    `);
    const catalog = rows.map(rowToMediaItem);
    if (catalog.length < 800) {
      throw new Error(`active KR catalog too small: ${catalog.length}`);
    }

    const digitalSignage = filterMediaByDiscoveryChips(catalog, {
      mainCategory: "ooh",
      subCategory: "digital_signage",
    });
    const vehicleWrap = filterMediaByDiscoveryChips(catalog, {
      mainCategory: "transit",
      subCategory: "vehicle_wrap",
    });

    const stagingIds = [
      "cmt9ocgm00000g4jk1gfl6gd2",
      "cmt9ocjik0002g4jkvf4po5iy",
    ];
    const stagingVisible = digitalSignage.filter((m) =>
      stagingIds.includes(m.id),
    ).length;

    const a2InVehicle = vehicleWrap.some(
      (m) => m.id === "cmr9xedzi000a04layhba2ulc",
    );
    if (a2InVehicle) {
      throw new Error("A2 visible in vehicle_wrap filter after rollback");
    }

    console.log(
      JSON.stringify(
        {
          pass: true,
          note: "PR1a browse does not filter by catalog_channel; NULL channel state must not empty list",
          catalog_channel: cs,
          activeKrCatalog: catalog.length,
          filterDigitalSignage: digitalSignage.length,
          filterVehicleWrap: vehicleWrap.length,
          stagingInDigitalSignageFilter: stagingVisible,
          a2InVehicleWrapFilter: a2InVehicle,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[gate5-ui] FAIL", e);
  process.exit(1);
});
