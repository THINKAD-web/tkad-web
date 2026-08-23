#!/usr/bin/env npx tsx
/**
 * pricing_mode 마이그레이션 dry-run — 프로덕션 적용 전 필수.
 *
 * Usage:
 *   # DB 직접 (Preview/스테이징 권장)
 *   DATABASE_URL="postgresql://..." npx tsx scripts/dry-run-pricing-mode-migration.mts
 *
 *   # DB 없으면 공개 카탈로그로 시뮬레이션 (읽기 전용)
 *   AUDIT_BASE=https://tkad.co.kr npx tsx scripts/dry-run-pricing-mode-migration.mts
 *
 * Writes: scripts/.dry-run-pricing-mode/report.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { isQuoteOnlyMedia } from "../lib/media-pricing-mode.ts";
import type { MediaItem } from "../lib/media-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, ".dry-run-pricing-mode");
const BASE = process.env.AUDIT_BASE ?? "https://tkad.co.kr";

/** migration.sql UPDATE 와 동일한 SQL 필터 (Prisma raw) */
const MIGRATION_WHERE_SQL = `
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

const EXPECTED_IDS = [
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

type Row = {
  id: string;
  name: string;
  price: number;
  mediaSubCategory: string | null;
  isActive: boolean;
  pricingMode?: string | null;
};

async function fromDatabase(): Promise<{
  source: string;
  before: Row[];
  wouldQuoteOnly: Row[];
  wouldStayFixed: Row[];
  wallMuralActive: Row[];
} | null> {
  const url = process.env.MIGRATION_DRY_RUN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url || process.env.MIGRATION_DRY_RUN_SOURCE === "catalog") return null;

  const db = new PrismaClient();
  try {
    const wallMuralActive = await db.$queryRaw<Row[]>`
      SELECT id, name, price, media_sub_category AS "mediaSubCategory",
             is_active AS "isActive", pricing_mode AS "pricingMode"
      FROM media
      WHERE is_active = true AND media_sub_category = 'wall_mural'
      ORDER BY name
    `;

    const wouldQuoteOnly = await db.$queryRawUnsafe<Row[]>(`
      SELECT id, name, price, media_sub_category AS "mediaSubCategory",
             is_active AS "isActive", pricing_mode AS "pricingMode"
      FROM media
      WHERE ${MIGRATION_WHERE_SQL}
      ORDER BY name
    `);

    const wouldIds = new Set(wouldQuoteOnly.map((r) => r.id));
    const wouldStayFixed = wallMuralActive.filter((r) => !wouldIds.has(r.id));

    return {
      source: "database",
      before: wallMuralActive,
      wouldQuoteOnly,
      wouldStayFixed,
      wallMuralActive,
    };
  } finally {
    await db.$disconnect();
  }
}

async function fromCatalog(): Promise<{
  source: string;
  before: Row[];
  wouldQuoteOnly: Row[];
  wouldStayFixed: Row[];
  wallMuralActive: Row[];
}> {
  const res = await fetch(`${BASE}/api/public/media-catalog`);
  const data = (await res.json()) as { medias?: MediaItem[] } | MediaItem[];
  const items = Array.isArray(data) ? data : (data.medias ?? []);
  const wallMuralActive = items
    .filter((m) => m.mediaSubCategory === "wall_mural")
    .map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price ?? 0,
      mediaSubCategory: m.mediaSubCategory ?? null,
      isActive: true,
      pricingMode: m.pricingMode ?? null,
    }));

  const wouldQuoteOnly = wallMuralActive.filter((m) =>
    isQuoteOnlyMedia(items.find((x) => x.id === m.id)!),
  );
  const wouldIds = new Set(wouldQuoteOnly.map((r) => r.id));
  const wouldStayFixed = wallMuralActive.filter((r) => !wouldIds.has(r.id));

  return {
    source: `catalog:${BASE}`,
    before: wallMuralActive,
    wouldQuoteOnly,
    wouldStayFixed,
    wallMuralActive,
  };
}

function validate(report: Awaited<ReturnType<typeof fromCatalog>>) {
  const gotIds = report.wouldQuoteOnly.map((r) => r.id).sort();
  const idMatch =
    gotIds.length === EXPECTED_IDS.length &&
    gotIds.every((id, i) => id === EXPECTED_IDS[i]);

  const positiveLeak = report.wouldQuoteOnly.filter((r) => r.price > 0);
  const pricedWallLost = report.wouldStayFixed.filter((r) => r.price > 0);

  return {
    ok:
      idMatch &&
      positiveLeak.length === 0 &&
      report.wouldQuoteOnly.length === 9 &&
      report.wallMuralActive.length === 45,
    idMatch,
    expectedCount: 9,
    actualQuoteOnlyCount: report.wouldQuoteOnly.length,
    wallMuralActiveCount: report.wallMuralActive.length,
    pricedWallStayingFixed: pricedWallLost.length,
    positivePriceInQuoteOnly: positiveLeak,
    expectedIds: EXPECTED_IDS,
    actualIds: gotIds,
  };
}

const result = (await fromDatabase()) ?? (await fromCatalog());
const checks = validate(result);

const report = {
  generatedAt: new Date().toISOString(),
  source: result.source,
  counts: {
    wallMuralActive: result.wallMuralActive.length,
    wouldQuoteOnly: result.wouldQuoteOnly.length,
    wouldStayFixed: result.wouldStayFixed.length,
  },
  checks,
  wouldQuoteOnly: result.wouldQuoteOnly,
  wouldStayFixedSample: result.wouldStayFixed.slice(0, 5),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(JSON.stringify(report.counts, null, 2));
console.log("checks:", checks.ok ? "PASS" : "FAIL", checks);
if (!checks.ok) process.exit(1);
