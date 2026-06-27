/**
 * Diagnose suspicious daily footfall / CPM outliers in DB-backed catalog.
 *
 * Usage:
 *   npx tsx scripts/diagnose-media-metrics.mts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/diagnose-media-metrics.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  computeNetworkDailyFootfall,
  NETWORK_DAILY_FOOTFALL_CAP,
} from "../lib/media-network-public.ts";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "../lib/ai-recommend-metrics.ts";
import type { MediaItem } from "../lib/media-data.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

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
      "DATABASE_URL is not set. Add it to .env.local or pass inline.",
    );
  }
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

async function main() {
  const prisma = createPrisma();
  try {
    const networks = await prisma.mediaNetwork.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        dailyFootfall: true,
        totalLocations: true,
        pricePackage: true,
        pricePerUnit: true,
        locations: {
          select: {
            dailyFootfall: true,
            unitCount: true,
          },
        },
      },
      orderBy: { dailyFootfall: "desc" },
      take: 200,
    });

    console.log("=== Networks: DB dailyFootfall vs public compute ===\n");
    for (const n of networks) {
      const computed = computeNetworkDailyFootfall({
        dailyFootfall: n.dailyFootfall,
        totalLocations: n.totalLocations,
        locations: n.locations,
      });
      const db = n.dailyFootfall ?? 0;
      const suspicious =
        db > NETWORK_DAILY_FOOTFALL_CAP ||
        (db > 0 && computed < db * 0.2 && n.locations.length > 0);
      if (!suspicious && db < 1_000_000) continue;
      console.log(
        [
          `nw_${n.id}`,
          n.name.slice(0, 40),
          `db=${fmt(n.dailyFootfall)}`,
          `public=${fmt(computed)}`,
          `locs=${n.locations.length}`,
        ].join(" | "),
      );
    }

    const medias = await prisma.media.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        dailyFootfall: true,
        impressions: true,
        price: true,
        type: true,
      },
      orderBy: { dailyFootfall: "desc" },
      take: 100,
    });

    console.log("\n=== Single media: footfall / CPM outliers ===\n");
    for (const m of medias) {
      const item = {
        id: m.id,
        name: m.name,
        location: "",
        type: m.type,
        price: m.price,
        dailyFootTraffic: m.dailyFootfall ?? 0,
        impressions: m.impressions ?? undefined,
      } as MediaItem;
      const cpm = estimatedCpmWon(item);
      const monthly = estimatedMonthlyImpressions(item);
      const suspicious =
        (m.dailyFootfall ?? 0) > 2_000_000 ||
        (cpm != null && cpm < 5 && m.price > 0);
      if (!suspicious) continue;
      console.log(
        [
          m.id,
          m.name.slice(0, 36),
          `daily=${fmt(m.dailyFootfall)}`,
          `imp=${fmt(m.impressions)}`,
          `monthly≈${fmt(monthly)}`,
          `cpm≈${cpm != null ? `₩${Math.round(cpm)}` : "—"}`,
        ].join(" | "),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
