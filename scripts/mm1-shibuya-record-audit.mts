/**
 * MM-1 — 시부야 Q'S EYE (및 유사) 매체 DB 조회
 * Usage:
 *   npx tsx scripts/mm1-shibuya-record-audit.mts
 *   DATABASE_URL=...production... npx tsx scripts/mm1-shibuya-record-audit.mts
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });
config({ path: resolve(root, ".env.local"), override: true });

function createDb() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const db = createDb();
  const host = process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`DB host: ${host}\n`);

  const overseas = await db.$queryRaw<
    {
      id: string;
      name: string;
      name_en: string | null;
      country: string | null;
      region: string;
      region_main: string | null;
      region_sub: string | null;
      latitude: number | null;
      longitude: number | null;
      price: number | null;
      price_options: unknown;
      daily_footfall: number | null;
      weekday_footfall: number | null;
      location: string;
    }[]
  >`
    SELECT id, name, name_en, country, region, region_main, region_sub,
           latitude, longitude, price, price_options, daily_footfall, weekday_footfall, location
    FROM media
    WHERE country IS DISTINCT FROM 'KR'
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  const rows = await db.media.findMany({
    where: {
      OR: [
        { name: { contains: "Q", mode: "insensitive" } },
        { nameEn: { contains: "Q", mode: "insensitive" } },
        { name: { contains: "시부야", mode: "insensitive" } },
        { nameEn: { contains: "Shibuya", mode: "insensitive" } },
        { location: { contains: "Shibuya", mode: "insensitive" } },
        { location: { contains: "시부야", mode: "insensitive" } },
        { name: { contains: "EYE", mode: "insensitive" } },
        { nameEn: { contains: "EYE", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      country: true,
      region: true,
      regionMain: true,
      regionSub: true,
      latitude: true,
      longitude: true,
      price: true,
      priceOptions: true,
      dailyFootfall: true,
      weekdayFootfall: true,
      location: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  console.log(JSON.stringify({ overseasCount: overseas.length, overseas, shibuyaMatches: rows }, null, 2));
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
