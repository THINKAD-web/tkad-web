/**
 * 표시가 SSOT CPM 전후 비교 (읽기 전용).
 *
 *   npx tsx scripts/diff-display-cpm-sample.mts
 *   npx tsx scripts/diff-display-cpm-sample.mts --slugs=koekseu-keipap-seukweeo-jeongwangpan-gwanggo,...
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import type { MediaItem, MediaPriceOption } from "../lib/media-data.ts";
import {
  mediaMetricsInputForDisplayCpm,
  resolveCpmWon,
  resolveCpmWonForDisplay,
} from "../lib/media-metrics.ts";
import { resolveMediaDisplayPrice } from "../lib/media-price-format.ts";

function rowAsMediaItem(row: {
  slug: string | null;
  name: string;
  price: number | null;
  pricePeriod: string | null;
  priceOptions: unknown;
  cpm: number | null;
  impressions: number | null;
  dailyFootfall: number | null;
}): MediaItem {
  return {
    slug: row.slug ?? "",
    name: row.name,
    price: row.price ?? 0,
    pricePeriod: (row.pricePeriod as MediaItem["pricePeriod"]) ?? "month",
    priceOptions: (Array.isArray(row.priceOptions)
      ? row.priceOptions
      : []) as MediaPriceOption[],
    cpm: row.cpm ?? undefined,
    impressions: row.impressions ?? undefined,
    dailyFootTraffic: row.dailyFootfall ?? undefined,
  } as MediaItem;
}

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), override: true });

const DEFAULT_SLUGS = [
  "koekseu-keipap-seukweeo-jeongwangpan-gwanggo",
  "gangnam-yeog-jeon-gwangpan",
  "gwanghwamun-saebit-jeon-gwangpan",
];

function parseSlugs(): string[] {
  const arg = process.argv.find((a) => a.startsWith("--slugs="));
  if (!arg) return DEFAULT_SLUGS;
  return arg.slice("--slugs=".length).split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const slugs = parseSlugs();

  const rows = await db.media.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: {
      slug: true,
      name: true,
      price: true,
      pricePeriod: true,
      priceOptions: true,
      cpm: true,
      impressions: true,
      dailyFootfall: true,
    },
  });

  const items = rows.map(rowAsMediaItem);
  const report = items.map((m) => {
    const display = resolveMediaDisplayPrice(m);
    const before = resolveCpmWon({
      cpm: m.cpm,
      price: m.price,
      impressions: m.impressions,
      dailyFootTraffic: m.dailyFootTraffic,
    });
    const after = resolveCpmWonForDisplay(m);
    const input = mediaMetricsInputForDisplayCpm(m);
    return {
      slug: m.slug,
      name: m.name,
      displayPriceWon: display.priceWon,
      dbRootPrice: m.price,
      monthlyPriceForCpm: input.price,
      impressions: m.impressions,
      storedCpm: m.cpm,
      cpmBeforeRootPrice: before,
      cpmAfterDisplayPrice: after,
      deltaWon: after != null && before != null ? after - before : null,
    };
  });

  const out = resolve(root, "reports/display-cpm-unify-sample.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${out}`);

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
