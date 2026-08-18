/**
 * LL-3 — 시부야 해외 admin Browse/region/footfall 검증
 * Usage: npx tsx scripts/verify-ll3-overseas-admin.mts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  overseasRegionDefaults,
  OVERSEAS_BROWSE_REGION_MAIN,
} from "../lib/media-country.ts";
import { stripLockedFieldsForMediaSave } from "../lib/media/locked-fields.ts";

const SLUG = "ll3-verify-shibuya-admin";
const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

function createDb() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const defaults = overseasRegionDefaults("JP");
  assert.equal(defaults.region, "jp");
  assert.equal(defaults.regionMain, OVERSEAS_BROWSE_REGION_MAIN);

  const { cleaned } = stripLockedFieldsForMediaSave(
    { dailyFootfall: 12000, weekdayFootfall: 10000, cpm: 5 },
    "JP",
  );
  assert.equal(cleaned.dailyFootfall, 12000);
  assert.equal("cpm" in cleaned, false);

  const db = createDb();
  let mediaId: string | null = null;
  try {
    await db.media.deleteMany({ where: { slug: SLUG } });
    const created = await db.media.create({
      data: {
        slug: SLUG,
        name: "LL3 시부야 테스트",
        location: "1-2-3 Dogenzaka, Shibuya, Tokyo",
        country: "JP",
        region: defaults.region,
        regionMain: defaults.regionMain,
        regionSub: defaults.regionSub,
        type: "digital",
        price: 15_000_000,
        dailyFootfall: 12000,
        weekdayFootfall: 10000,
        latitude: 35.6595,
        longitude: 139.7004,
        isActive: true,
      },
    });
    mediaId = created.id;

    const row = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
    assert.equal(row.region, "jp");
    assert.equal(row.regionMain, "overseas");
    assert.equal(row.dailyFootfall, 12000);

    // ── Planner exclusion: country=KR is the DB gate (NOT regionMain) ──
    const plannerWhere = { isActive: true, country: "KR" as const };
    const jpMatchesPlannerQuery = await db.media.findFirst({
      where: { ...plannerWhere, id: mediaId },
    });
    assert.equal(
      jpMatchesPlannerQuery,
      null,
      "JP row must not match fetchPlannerMediaCatalog where (country=KR)",
    );

    // Control: KR + regionMain=overseas still matches country gate (regionMain is not in WHERE)
    const controlSlug = `${SLUG}-kr-control`;
    await db.media.deleteMany({ where: { slug: controlSlug } });
    const krControl = await db.media.create({
      data: {
        slug: controlSlug,
        name: "LL3 KR control (regionMain=overseas)",
        location: "Seoul test",
        country: "KR",
        region: "seoul",
        regionMain: OVERSEAS_BROWSE_REGION_MAIN,
        regionSub: OVERSEAS_BROWSE_REGION_MAIN,
        type: "digital",
        price: 1_000_000,
        latitude: 37.5665,
        longitude: 126.978,
        isActive: true,
      },
    });
    const krMatchesPlannerQuery = await db.media.findFirst({
      where: { ...plannerWhere, id: krControl.id },
    });
    assert.ok(
      krMatchesPlannerQuery,
      "KR row with regionMain=overseas must still match country=KR planner query",
    );

    const plannerIds = new Set(
      (
        await db.media.findMany({
          where: plannerWhere,
          select: { id: true },
        })
      ).map((r) => r.id),
    );
    assert.equal(
      plannerIds.has(mediaId),
      false,
      "planner DB gate excludes JP (country=KR WHERE)",
    );
    assert.equal(
      plannerIds.has(krControl.id),
      true,
      "planner DB gate includes KR even when regionMain=overseas",
    );

    await db.media.delete({ where: { id: krControl.id } }).catch(() => {});

    console.log(
      "  planner gate: findMany { isActive, country: 'KR' } — regionMain not in WHERE",
    );
    console.log("  control: KR+regionMain=overseas ∈ plannerIds; JP ∉ plannerIds");

    console.log("✅ LL-3 overseas admin verification passed");
  } finally {
    if (mediaId) await db.media.delete({ where: { id: mediaId } }).catch(() => {});
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ LL-3 failed", e);
  process.exit(1);
});
