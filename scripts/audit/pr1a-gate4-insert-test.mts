#!/usr/bin/env node
/**
 * PR1a Gate 4 — post-forward INSERT smoke (preview DB).
 * Admin POST path + CSV import createMediaFromCsvRow; browse main omitted.
 * Deletes test rows on success.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/audit/pr1a-gate4-insert-test.mts
 */
import pg from "pg";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { resolveCatalogChannelForMediaWrite } from "../../lib/catalog-channel.ts";
import { createMediaFromCsvRow } from "../../app/api/admin/medias/import-csv/route.ts";

const TAG = "pr1a-gate4-insert-test";

function createDb(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function verifyRow(
  client: pg.Client,
  id: string,
  label: string,
): Promise<{ id: string; name: string; media_main_category: string | null; catalog_channel: string }> {
  const { rows } = await client.query<{
    id: string;
    name: string;
    media_main_category: string | null;
    catalog_channel: string;
  }>(
    `SELECT id, name, media_main_category, catalog_channel FROM media WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error(`${label}: row ${id} not found`);
  if (row.catalog_channel !== "offline") {
    throw new Error(
      `${label}: expected catalog_channel=offline, got ${row.catalog_channel}`,
    );
  }
  return row;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  const createdIds: string[] = [];
  const ts = Date.now();
  const db = createDb();

  try {
    const adminName = `${TAG}-admin-${ts}`;
    const adminMedia = await db.media.create({
      data: {
        name: adminName,
        location: "서울 강남구 테헤란로 1",
        region: "서울",
        type: "static",
        price: 1_000_000,
        catalogChannel: resolveCatalogChannelForMediaWrite({
          mediaMainCategory: null,
        }),
        isActive: false,
      },
    });
    createdIds.push(adminMedia.id);
    const adminRow = await verifyRow(client, adminMedia.id, "admin POST");
    console.info("[gate4] admin POST OK", adminRow);

    const csvName = `${TAG}-csv-${ts}`;
    const csvId = await createMediaFromCsvRow(db, {
      rowIndex: 1,
      name: csvName,
      type: "static",
      location: "서울 중구 세종대로 1",
      price: 2_000_000,
      spec: "",
      width: null,
      height: null,
      exposure: null,
      description: "gate4 csv import smoke",
      region: "서울",
    });
    createdIds.push(csvId);
    const csvRow = await verifyRow(client, csvId, "CSV import");
    console.info("[gate4] CSV import OK", csvRow);

    console.log(
      JSON.stringify(
        {
          pass: true,
          created: createdIds,
          checks: {
            admin: {
              id: adminRow.id,
              catalog_channel: adminRow.catalog_channel,
              media_main_category: adminRow.media_main_category,
            },
            csv: {
              id: csvRow.id,
              catalog_channel: csvRow.catalog_channel,
              media_main_category: csvRow.media_main_category,
            },
          },
        },
        null,
        2,
      ),
    );
  } finally {
    if (createdIds.length > 0) {
      await client.query(`DELETE FROM media WHERE id = ANY($1::text[])`, [
        createdIds,
      ]);
      console.info("[gate4] cleaned up test rows", createdIds);
    }
    await client.end();
    await db.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error("[gate4] FAIL", e);
  process.exit(1);
});
