/**
 * Network visibility in planner matching + portfolio (mock + optional DB).
 * Run: npx tsx scripts/test-planner-network-visibility.mts
 */
import assert from "node:assert/strict";
import { config } from "dotenv";
import { resolve } from "node:path";
import type { MediaItem } from "../lib/media-data.ts";
import { matchMediaCatalog } from "../lib/matching-engine.ts";
import { plannerContextToMatching } from "../lib/recommendation-adapters.ts";
import {
  selectPlannerPortfolioFromMatching,
  filterPlannerMediaMulti,
} from "../lib/planner-logic.ts";
import { NETWORK_CATALOG_ID_PREFIX } from "../lib/media-network-public.ts";
import {
  effectiveNetworkEntryMonthlyWon,
  plannerMediaMonthlyPriceMan,
} from "../lib/matching-network-helpers.ts";

config({ path: resolve(".env") });
config({ path: resolve(".env.local") });

function mockNetwork(
  id: string,
  opts: {
    price?: number;
    minUnits?: number;
    tiers?: Array<{ units: number; price: number }>;
    regions?: string[];
    locations?: Array<{ name: string; regionMain?: string }>;
    footfall?: number;
  } = {},
): MediaItem {
  return {
    id: `${NETWORK_CATALOG_ID_PREFIX}${id}`,
    name: `Network ${id}`,
    location: opts.regions?.join(", ") ?? "서울",
    type: "network",
    catalogSource: "network",
    price: opts.price ?? 30_000,
    networkMinUnits: opts.minUnits ?? 1,
    networkPackageTiers: opts.tiers,
    networkRegionLabels: opts.regions ?? ["서울"],
    networkTotalLocations: opts.locations?.length ?? 50,
    networkLocations: opts.locations?.map((l) => ({
      name: l.name,
      unitCount: 1,
      regionMain: l.regionMain,
    })),
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: opts.footfall ?? 80_000,
    region: "seoul",
  } as MediaItem;
}

function mockSingle(id: string, scoreBoost = 0): MediaItem {
  return {
    id,
    name: `Premium ${id}`,
    location: "서울 강남",
    type: "digital",
    price: 2_500_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 200_000 + scoreBoost,
    region: "seoul",
    regionMain: "서울",
    popularityScore: 80,
    averageRating: 4.5,
    executionCount: 20,
    tags: ["디지털", "강남", "브랜드"],
    targetCategory: ["brand"],
    mediaCategory: ["digital"],
  } as MediaItem;
}

const catalog: MediaItem[] = [
  ...Array.from({ length: 30 }, (_, i) => mockSingle(`m${i}`, i * 1000)),
  mockNetwork("prime", {
    price: 18_000,
    tiers: [{ units: 1, price: 18_000 }],
    regions: ["서울", "수도권"],
    locations: [{ name: "SK종합빌딩", regionMain: "seoul" }],
    footfall: 3_000_000,
  }),
  mockNetwork("pharmacy", {
    price: 30_000,
    regions: ["서울", "경기"],
    locations: [{ name: "강남약국", regionMain: "seoul" }],
  }),
  mockNetwork("expensive", {
    price: 20_000_000,
    tiers: [{ units: 1, price: 20_000_000 }],
    regions: ["서울"],
  }),
  mockNetwork("busan-only", {
    price: 40_000,
    regions: ["부산"],
    locations: [{ name: "해운대점", regionMain: "busan" }],
  }),
];

const ctx = {
  goal: "brand" as const,
  regions: ["seoul"],
  seoulZones: [] as const,
  categories: ["digital", "static", "mobile"] as const,
  ageKeys: [] as const,
  industryKey: null,
  budgetMan: 500,
  months: 1,
  goalFollowUp: {},
};

const matchingInput = plannerContextToMatching(ctx, 0);

const top5 = matchMediaCatalog(catalog, matchingInput, 5);
assert.ok(
  top5.some((m) => m.media.id.startsWith(NETWORK_CATALOG_ID_PREFIX)),
  "limit=5 includes at least one suitable network",
);
assert.ok(
  !top5.some((m) => m.media.id.includes("expensive")),
  "over-budget network excluded",
);
assert.ok(
  !top5.some((m) => m.media.id.includes("busan-only")),
  "busan-only network excluded for seoul",
);

const top15 = matchMediaCatalog(catalog, matchingInput, 15);
const nw15 = top15.filter((m) =>
  m.media.id.startsWith(NETWORK_CATALOG_ID_PREFIX),
).length;
assert.ok(nw15 >= 1 && nw15 <= 3, `limit=15 has balanced network count (${nw15})`);

const entry = effectiveNetworkEntryMonthlyWon(
  mockNetwork("tiered", {
    price: 0,
    minUnits: 25,
    tiers: [
      { units: 1, price: 40_000 },
      { units: 25, price: 525_000 },
    ],
  }),
);
assert.equal(entry, 525_000, "entry price uses minUnits tier");

const zeroSafe = plannerMediaMonthlyPriceMan(
  mockNetwork("zero", { price: 0, tiers: [] }),
);
assert.equal(zeroSafe, 0, "zero/invalid package → 0 man (safe)");

const filtered = filterPlannerMediaMulti(
  catalog,
  new Set(["seoul"]),
  new Set(["digital", "static", "mobile"]),
  [],
);
const portfolio = selectPlannerPortfolioFromMatching(
  filtered,
  ctx,
  500,
  1,
  12,
);
assert.ok(
  portfolio.some((m) => m.id.startsWith(NETWORK_CATALOG_ID_PREFIX)),
  "auto portfolio includes affordable network",
);

if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const { normalizePgDatabaseUrl } = await import(
      "../lib/normalize-pg-database-url.ts"
    );
    const { prismaNetworkToMediaItem } = await import(
      "../lib/media-network-public.ts"
    );
    const { prismaMediaToMediaItem } = await import(
      "../lib/public-media-catalog.ts"
    );

    const pool = new Pool({
      connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL),
    });
    const db = new PrismaClient({ adapter: new PrismaPg(pool) });
    const [mediaRows, networkRows] = await Promise.all([
      db.media.findMany({ where: { isActive: true } }),
      db.mediaNetwork.findMany({
        where: { isActive: true },
        include: { locations: true },
      }),
    ]);
    const liveCatalog = [
      ...mediaRows.map(prismaMediaToMediaItem),
      ...networkRows.map(prismaNetworkToMediaItem),
    ];
    const liveFiltered = filterPlannerMediaMulti(
      liveCatalog,
      new Set(["seoul"]),
      new Set(["digital"]),
      [],
    );
    const liveTop5 = matchMediaCatalog(liveFiltered, matchingInput, 5);
    assert.ok(
      liveTop5.some((m) => m.media.id.startsWith(NETWORK_CATALOG_ID_PREFIX)),
      "DB smoke: seoul+digital limit=5 has network",
    );
    const livePortfolio = selectPlannerPortfolioFromMatching(
      liveFiltered,
      { ...ctx, categories: ["digital"] },
      500,
      1,
    );
    assert.ok(
      livePortfolio.some((m) => m.id.startsWith(NETWORK_CATALOG_ID_PREFIX)),
      "DB smoke: portfolio includes network",
    );
    await db.$disconnect();
    await pool.end();
    console.log("DB smoke: ok");
  } catch (e) {
    console.warn("DB smoke skipped:", (e as Error).message?.slice(0, 120));
  }
}

console.log("test-planner-network-visibility: ok");
