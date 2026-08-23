#!/usr/bin/env npx tsx
/**
 * pricing_mode 마이그레이션 dry-run — **DB 필수** (프로덕션 게이트).
 *
 * 카탈로그만으로는 "현재 DB 오염"을 감지할 수 없음.
 * 반드시 Preview/스테이징/프로덕션 DB URL로 실행할 것.
 *
 * Usage:
 *   MIGRATION_DRY_RUN_DATABASE_URL="<db-url>" npx tsx scripts/dry-run-pricing-mode-migration.mts
 *
 *   # Vercel env pull 후
 *   # Preview:  source .env.preview.local
 *   # Production (조회 전용): MIGRATION_DRY_RUN_ENV=production npx tsx ...
 *
 * Writes: scripts/.dry-run-pricing-mode/report.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.preview.local"), override: true });
if (process.env.MIGRATION_DRY_RUN_ENV === "production") {
  config({ path: resolve(root, ".env.production.local"), override: true });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, ".dry-run-pricing-mode");

/** repair + initial narrow UPDATE 와 동일 */
const QUOTE_ONLY_WHERE_SQL = `
  "is_active" = true
  AND "media_sub_category" = 'wall_mural'
  AND COALESCE("price", 0) <= 0
  AND NOT (
    "price_options" IS NOT NULL
    AND jsonb_typeof("price_options"::jsonb) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements("price_options"::jsonb) AS opt
      WHERE COALESCE((opt->>'price')::numeric, 0) > 0
    )
  )
`;

const EXPECTED_WALL = { quoteOnly: 9, fixed: 36, activeWallMural: 45 } as const;

const EXPECTED_QUOTE_ONLY_IDS = [
  "cmnz9wm17000004kyd4r72mug",
  "cmq3vyc6o000004jm5h9a4yki",
  "cmq3w55p4000304lg3tqbvgtw",
  "cmq3wd9aw000504l5lfq1lha8",
  "cmq3whqri000h04lgafc3x5zu",
  "cmq3wpngl000804l55es4eret",
  "cmq3wwc63000j04lgcmp77yeg",
  "cmq3x2965000m04l5hq30xrp5",
  "cmq3x5pvz000504jpapuvuztt",
].sort();

type ModeCount = { pricing_mode: string; n: number };

type WallRow = {
  id: string;
  name: string;
  price: number;
  pricing_mode: string | null;
};

type DbSnapshot = {
  source: string;
  hasPricingModeColumn: boolean;
  pendingMigrations: string[];
  activeMediaTotal: number;
  activeMediaWithPricingMode: number;
  wallMuralByMode: ModeCount[];
  currentWallQuoteOnly: number;
  currentWallFixed: number;
  /** 정상 단가인데 quote_only — 오염 지표 */
  pricedWallMarkedQuoteOnly: WallRow[];
  /** 무단가인데 fixed — 미적용 지표 */
  unpricedWallStillFixed: WallRow[];
  expectedQuoteOnlyIds: string[];
  expectedAfterRepair: { quote_only: number; fixed: number };
  delta: {
    quoteOnlyChange: number;
    fixedChange: number;
    wronglyQuoteOnly: number;
    missingQuoteOnly: number;
  };
  alreadyCorrect: boolean;
  corruptionDetected: boolean;
};

async function createDb() {
  const url = normalizePgDatabaseUrl(
    process.env.MIGRATION_DRY_RUN_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "",
  );
  if (!url) return null;
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { db, pool, url };
}

async function inspectDatabase(): Promise<DbSnapshot | null> {
  const conn = await createDb();
  if (!conn) return null;
  const { db, pool } = conn;

  try {
    const colRows = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'media'
          AND column_name = 'pricing_mode'
      ) AS exists
    `;
    const hasPricingModeColumn = colRows[0]?.exists === true;

    const pendingMigrations = hasPricingModeColumn
      ? []
      : ["20260823140000_media_pricing_mode", "20260823153000_media_pricing_mode_repair"];

    const activeStats = hasPricingModeColumn
      ? await db.$queryRaw<{ total: number; with_mode: number }[]>`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE pricing_mode IS NOT NULL)::int AS with_mode
          FROM media
          WHERE is_active = true
        `
      : [{ total: 0, with_mode: 0 }];

    const wallMuralByMode: ModeCount[] = hasPricingModeColumn
      ? await db.$queryRaw<ModeCount[]>`
          SELECT pricing_mode::text, COUNT(*)::int AS n
          FROM media
          WHERE is_active = true AND media_sub_category = 'wall_mural'
          GROUP BY pricing_mode
          ORDER BY pricing_mode
        `
      : [];

    const currentWallQuoteOnly =
      wallMuralByMode.find((r) => r.pricing_mode === "quote_only")?.n ?? 0;
    const currentWallFixed =
      wallMuralByMode.find((r) => r.pricing_mode === "fixed")?.n ?? 0;

    const pricedWallMarkedQuoteOnly: WallRow[] = hasPricingModeColumn
      ? await db.$queryRaw<WallRow[]>`
          SELECT id, name, price, pricing_mode::text AS pricing_mode
          FROM media
          WHERE is_active = true
            AND media_sub_category = 'wall_mural'
            AND pricing_mode = 'quote_only'
            AND COALESCE(price, 0) > 0
          ORDER BY name
          LIMIT 20
        `
      : [];

    const unpricedWallStillFixed: WallRow[] = hasPricingModeColumn
      ? await db.$queryRawUnsafe<WallRow[]>(`
          SELECT id, name, price, pricing_mode::text AS pricing_mode
          FROM media
          WHERE ${QUOTE_ONLY_WHERE_SQL}
            AND pricing_mode = 'fixed'
          ORDER BY name
        `)
      : [];

    const expectedQuoteOnlyRows = hasPricingModeColumn
      ? await db.$queryRawUnsafe<{ id: string }[]>(`
          SELECT id FROM media WHERE ${QUOTE_ONLY_WHERE_SQL}
        `)
      : [];
    const expectedQuoteOnlyIds = (
      expectedQuoteOnlyRows.length > 0
        ? expectedQuoteOnlyRows.map((r) => r.id)
        : [...EXPECTED_QUOTE_ONLY_IDS]
    ).sort();

    const expectedAfterRepair = {
      quote_only: EXPECTED_WALL.quoteOnly,
      fixed: EXPECTED_WALL.fixed,
    };

    const wronglyQuoteOnly = pricedWallMarkedQuoteOnly.length;
    const missingQuoteOnly = unpricedWallStillFixed.length;

    const alreadyCorrect =
      hasPricingModeColumn &&
      currentWallQuoteOnly === EXPECTED_WALL.quoteOnly &&
      currentWallFixed === EXPECTED_WALL.fixed &&
      wronglyQuoteOnly === 0 &&
      missingQuoteOnly === 0;

    const corruptionDetected =
      hasPricingModeColumn &&
      (wronglyQuoteOnly > 0 ||
        currentWallQuoteOnly > EXPECTED_WALL.quoteOnly ||
        (currentWallQuoteOnly > 0 &&
          currentWallQuoteOnly !== EXPECTED_WALL.quoteOnly));

    return {
      source: process.env.MIGRATION_DRY_RUN_ENV === "production"
        ? "database:production"
        : "database",
      hasPricingModeColumn,
      pendingMigrations,
      activeMediaTotal: activeStats[0]?.total ?? 0,
      activeMediaWithPricingMode: activeStats[0]?.with_mode ?? 0,
      wallMuralByMode,
      currentWallQuoteOnly,
      currentWallFixed,
      pricedWallMarkedQuoteOnly,
      unpricedWallStillFixed,
      expectedQuoteOnlyIds,
      expectedAfterRepair,
      delta: {
        quoteOnlyChange:
          expectedAfterRepair.quote_only - currentWallQuoteOnly,
        fixedChange: expectedAfterRepair.fixed - currentWallFixed,
        wronglyQuoteOnly,
        missingQuoteOnly,
      },
      alreadyCorrect,
      corruptionDetected,
    };
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

function validate(snapshot: DbSnapshot) {
  const idMatch =
    snapshot.expectedQuoteOnlyIds.length === EXPECTED_QUOTE_ONLY_IDS.length &&
    snapshot.expectedQuoteOnlyIds.every(
      (id, i) => id === EXPECTED_QUOTE_ONLY_IDS[i],
    );

  const expectedTargetsOk =
    idMatch &&
    snapshot.expectedQuoteOnlyIds.length === EXPECTED_WALL.quoteOnly;

  const needsRepair =
    snapshot.hasPricingModeColumn &&
    !snapshot.alreadyCorrect &&
    (snapshot.corruptionDetected || snapshot.delta.missingQuoteOnly > 0);
  const needsInitialMigration = !snapshot.hasPricingModeColumn;

  const gateOk =
    expectedTargetsOk &&
    !snapshot.corruptionDetected &&
    (snapshot.alreadyCorrect || needsInitialMigration || needsRepair);

  return {
    ok: gateOk && expectedTargetsOk,
    expectedTargetsOk,
    corruptionDetected: snapshot.corruptionDetected,
    alreadyCorrect: snapshot.alreadyCorrect,
    needsRepair,
    needsInitialMigration,
    idMatch,
    expectedIds: EXPECTED_QUOTE_ONLY_IDS,
    actualExpectedIds: snapshot.expectedQuoteOnlyIds,
  };
}

const snapshot = await inspectDatabase();
if (!snapshot) {
  console.error(
    "FAIL: DATABASE_URL required. Catalog-only dry-run cannot gate production migrate.",
  );
  process.exit(1);
}

const checks = validate(snapshot);

const report = {
  generatedAt: new Date().toISOString(),
  snapshot,
  checks,
  summary: {
    before: {
      wallMural: {
        quote_only: snapshot.currentWallQuoteOnly,
        fixed: snapshot.currentWallFixed,
        byMode: snapshot.wallMuralByMode,
      },
      corruption: {
        pricedRowsMarkedQuoteOnly: snapshot.pricedWallMarkedQuoteOnly.length,
        samples: snapshot.pricedWallMarkedQuoteOnly.slice(0, 5),
      },
    },
    afterRepairExpected: snapshot.expectedAfterRepair,
    delta: snapshot.delta,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log("── 현재 DB (변경 전) ──");
console.log(
  JSON.stringify(
    {
      hasColumn: snapshot.hasPricingModeColumn,
      wallMuralByMode: snapshot.wallMuralByMode,
      pricedWallWronglyQuoteOnly: snapshot.pricedWallMarkedQuoteOnly.length,
    },
    null,
    2,
  ),
);
console.log("── repair 후 예상 ──");
console.log(JSON.stringify(snapshot.expectedAfterRepair, null, 2));
console.log("── 차이 ──");
console.log(JSON.stringify(snapshot.delta, null, 2));
console.log("checks:", checks.ok ? "PASS" : "FAIL", checks);

if (snapshot.corruptionDetected) {
  console.error(
    "\nBLOCKER: DB already corrupted (priced wall_mural marked quote_only).",
  );
  console.error("Run repair migration before trusting Preview/production UI.");
}

if (!checks.ok) process.exit(1);
