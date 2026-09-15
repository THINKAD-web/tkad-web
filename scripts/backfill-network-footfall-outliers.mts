/**
 * Backfill inflated network dailyFootfall values that distort public metrics.
 *
 * Rules (--apply writes):
 * - dailyFootfall > NETWORK_DAILY_FOOTFALL_CAP → set null (public compute uses locations/floor)
 * - dailyFootfall > 5× computeNetworkDailyFootfall from locations → set null
 *
 * Usage:
 *   npx tsx scripts/backfill-network-footfall-outliers.mts
 *   npx tsx scripts/backfill-network-footfall-outliers.mts --apply
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
      "DATABASE_URL is not set. Add it to .env.local or pass inline.",
    );
  }
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: apply ? 3 : 2,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

type Patch = { id: string; name: string; from: number; reason: string };

function shouldClearFootfall(
  db: number,
  computedWithDb: number,
  computedWithoutDb: number,
  locationCount: number,
): { clear: boolean; reason: string } {
  if (db > NETWORK_DAILY_FOOTFALL_CAP) {
    return {
      clear: true,
      reason: `db>${NETWORK_DAILY_FOOTFALL_CAP.toLocaleString()}`,
    };
  }
  if (
    locationCount > 0 &&
    computedWithoutDb > 0 &&
    db > computedWithoutDb * 5
  ) {
    return {
      clear: true,
      reason: `db>${computedWithoutDb.toLocaleString()}×5 (location-based)`,
    };
  }
  if (db > 0 && computedWithDb < db * 0.5 && locationCount > 0) {
    return {
      clear: true,
      reason: "public compute diverges >50% from db with locations present",
    };
  }
  return { clear: false, reason: "" };
}

async function main() {
  const prisma = createPrisma();
  const patches: Patch[] = [];

  try {
    const networks = await prisma.mediaNetwork.findMany({
      where: { isActive: true, dailyFootfall: { not: null } },
      select: {
        id: true,
        name: true,
        dailyFootfall: true,
        totalLocations: true,
        locations: {
          select: { dailyFootfall: true, unitCount: true },
        },
      },
    });

    for (const n of networks) {
      const db = n.dailyFootfall ?? 0;
      if (db <= 0) continue;
      const computedWithDb = computeNetworkDailyFootfall({
        dailyFootfall: n.dailyFootfall,
        totalLocations: n.totalLocations,
        locations: n.locations,
      });
      const computedWithoutDb = computeNetworkDailyFootfall({
        dailyFootfall: null,
        totalLocations: n.totalLocations,
        locations: n.locations,
      });
      const { clear, reason } = shouldClearFootfall(
        db,
        computedWithDb,
        computedWithoutDb,
        n.locations.length,
      );
      if (clear) {
        patches.push({ id: n.id, name: n.name, from: db, reason });
      }
    }

    console.log(
      apply ? "APPLY mode — writing updates\n" : "DRY RUN — no writes\n",
    );
    if (patches.length === 0) {
      console.log("No network footfall outliers matched backfill rules.");
      return;
    }

    for (const p of patches) {
      console.log(
        `nw_${p.id} | ${p.name.slice(0, 40)} | clear ${p.from.toLocaleString()} | ${p.reason}`,
      );
      if (apply) {
        await prisma.mediaNetwork.update({
          where: { id: p.id },
          data: { dailyFootfall: null },
        });
      }
    }

    console.log(`\n${patches.length} network(s) ${apply ? "updated" : "would update"}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
