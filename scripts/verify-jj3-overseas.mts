/**
 * JJ-3 — 시부야 JP 매체 재현 + KR 회귀 (DB + 표시 포매터).
 * Usage: npx tsx scripts/verify-jj3-overseas.mts
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
  formatMediaPriceForDisplay,
  formatMediaPriceJpyPreview,
} from "../lib/media-display-currency.ts";
import { formatCatalogPriceFieldWon } from "../lib/media-price-format.ts";
import { prismaMediaToMediaItem } from "../lib/public-media-catalog.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

function createDb() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const SLUG = "jj3-verify-shibuya-u-series";
const TEST_NAME_KO = "JJ3 시부야 U시리즈 테스트";
const PRICE_KRW = 15_000_000;

async function main() {
  const db = createDb();
  let mediaId: string | null = null;

  try {
    console.log("── JJ-3.1 ¥ 표시 (포매터) ──");
    process.env.KRW_JPY_RATE = "0.1126";
    const preview = formatMediaPriceJpyPreview(PRICE_KRW);
    assert.ok(preview?.startsWith("¥"), `preview: ${preview}`);
    const jpLabel = formatMediaPriceForDisplay(PRICE_KRW, "JP", "ko-KR");
    assert.match(jpLabel, /^¥/);
    assert.equal(jpLabel, "¥1,689,000");
    const krLabel = formatMediaPriceForDisplay(PRICE_KRW, "KR", "ko-KR");
    assert.match(krLabel, /₩/);
    assert.match(krLabel, /1,500만/);
    console.log(`  ¥ 미리보기: ${preview}`);
    console.log(`  JP 상세: ${jpLabel}`);
    console.log(`  KR 상세: ${krLabel}`);

    console.log("\n── JJ-3.2 DB 등록 (country=JP, 원화 저장) ──");
    await db.media.deleteMany({ where: { slug: SLUG } });

    const created = await db.media.create({
      data: {
        slug: SLUG,
        name: TEST_NAME_KO,
        nameEn: null,
        location: "1-2-3 Dogenzaka, Shibuya, Tokyo",
        locationEn: null,
        country: "JP",
        region: "jp",
        type: "digital",
        price: PRICE_KRW,
        description: "시부야 스クランブル交差点 인근 디지털 빌보드 테스트",
        descriptionEn: null,
        latitude: 35.6595,
        longitude: 139.7004,
        isActive: true,
      },
    });
    mediaId = created.id;
    assert.equal(created.price, PRICE_KRW);
    assert.equal(created.country, "JP");
    assert.equal(created.descriptionEn, null);
    assert.equal(created.locationEn, null);
    console.log(`  created id=${mediaId} slug=${SLUG}`);

    console.log("\n── JJ-3.3 카탈로그 read (EN fallback runtime only) ──");
    const row = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
    const item = prismaMediaToMediaItem({
      ...row,
      advertiserExecutions: [],
    });
    assert.equal(item.country, "JP");
    const heroPrice = formatCatalogPriceFieldWon(item.price, "ko-KR", item.country);
    assert.match(heroPrice, /^¥/);
    assert.equal(heroPrice, "¥1,689,000");
    assert.ok(item.descriptionEn?.includes("시부야") || item.descriptionEn?.length);
    assert.ok(item.locationEn?.length);
    const fresh = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
    assert.equal(fresh.descriptionEn, null, "fallback must not persist to DB");
    assert.equal(fresh.locationEn, null, "fallback must not persist to DB");
    console.log(`  hero ¥: ${heroPrice}`);
    console.log(`  runtime descriptionEn: ${item.descriptionEn?.slice(0, 40)}…`);

    console.log("\n── JJ-3.4 AI 초안 시뮬레이션 → 저장 ──");
    await db.media.update({
      where: { id: mediaId },
      data: {
        nameEn: "Shibuya U-Series Digital Billboard",
        descriptionEn: "Premium DOOH facing Shibuya scramble crossing.",
        locationEn: "Dogenzaka, Shibuya, Tokyo",
      },
    });
    const saved = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
    assert.equal(saved.nameEn, "Shibuya U-Series Digital Billboard");
    assert.ok(saved.descriptionEn?.startsWith("Premium"));
    assert.ok(saved.locationEn?.includes("Shibuya"));
    const itemEn = prismaMediaToMediaItem({
      ...saved,
      advertiserExecutions: [],
    });
    assert.equal(itemEn.descriptionEn, saved.descriptionEn);
    assert.equal(itemEn.locationEn, saved.locationEn);
    console.log("  EN fields persisted after explicit update");

    console.log("\n── JJ-3.5 KR 회귀 ──");
    const krMedia = await db.media.findFirst({
      where: { country: "KR", isActive: true, price: { gt: 0 } },
      select: { price: true, country: true, name: true },
    });
    if (krMedia) {
      const krDisplay = formatCatalogPriceFieldWon(
        krMedia.price,
        "ko-KR",
        krMedia.country,
      );
      assert.match(krDisplay, /₩/);
      assert.doesNotMatch(krDisplay, /^¥/);
      console.log(`  KR sample "${krMedia.name}": ${krDisplay}`);
    } else {
      console.log("  (skip: no active KR media in DB)");
    }

    console.log("\n✅ JJ-3 verification passed");
  } finally {
    if (mediaId) {
      await db.media.delete({ where: { id: mediaId } }).catch(() => {});
    }
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n❌ JJ-3 verification failed");
  console.error(e);
  process.exit(1);
});
