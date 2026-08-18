/**
 * QQ-4 — country=JP region taxonomy stale 레코드 dry-run (execute 없음)
 * Usage: DATABASE_URL=... npx tsx scripts/qq4-overseas-region-dry-run.mts
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { OVERSEAS_BROWSE_REGION_MAIN } from "../lib/media-country.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.$queryRaw<
    {
      id: string;
      name: string;
      country: string;
      region: string;
      region_main: string | null;
      region_sub: string | null;
      region_zone: string | null;
    }[]
  >`
    SELECT id, name, country, region, region_main, region_sub, region_zone
    FROM media
    WHERE country = 'JP'
      AND (
        region_main IS DISTINCT FROM ${OVERSEAS_BROWSE_REGION_MAIN}
        OR region_sub IS NOT NULL
        OR region_zone IS NOT NULL
      )
    ORDER BY name
  `;

  console.log(`Stale JP region records: ${rows.length}\n`);
  console.log(
    "| id | name | region | region_main | region_sub | region_zone | → proposed |",
  );
  console.log(
    "|----|------|--------|-------------|------------|-------------|------------|",
  );

  for (const r of rows) {
    console.log(
      `| ${r.id.slice(0, 12)}… | ${r.name.slice(0, 18)}… | ${r.region} | ${r.region_main ?? "null"} | ${r.region_sub ?? "null"} | ${r.region_zone ?? "null"} | main=overseas, sub=null, zone=null |`,
    );
  }

  if (rows.length > 0) {
    console.log("\n--- SQL preview (DO NOT RUN without approval) ---");
    console.log(`UPDATE media SET
  region_main = '${OVERSEAS_BROWSE_REGION_MAIN}',
  region_sub = NULL,
  region_zone = NULL,
  region = 'jp',
  updated_at = NOW()
WHERE country = 'JP'
  AND (
    region_main IS DISTINCT FROM '${OVERSEAS_BROWSE_REGION_MAIN}'
    OR region_sub IS NOT NULL
    OR region_zone IS NOT NULL
  );`);
  }

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
