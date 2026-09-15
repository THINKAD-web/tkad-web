/**
 * STEP1 1안 — 3c hotspot 효과 golden (DB 카탈로그 + hotspot_tags 필요)
 * npx tsx --env-file=.env.local --test lib/matching/__tests__/step1-golden-3c.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { matchMediaCatalog } from "@/lib/matching-engine";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import { buildAiRecommendInputFromFreetextRaw } from "@/lib/recommend/build-freetext-recommend-input";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
config({ path: ".env.local" });

const STEP1_1_RAW = `목적: 제주 내 브랜드 리마인드
타깃: 내국인(제주도민)
거점: 제주도민 주요 생활권·이동 동선 고려
기간: 10월 말 ~ 11월 중순
예산: 2,500만원`;

async function loadCatalog() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  try {
    const pool = new Pool({ connectionString: url });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const rows = await prisma.media.findMany({
      where: publicActiveMediaWhere(),
    });
    await prisma.$disconnect();
    await pool.end();
    return rows.map(prismaMediaToMediaItem);
  } catch {
    return null;
  }
}

function topJejuNames(
  items: ReturnType<typeof matchMediaCatalog>,
  n = 10,
): string[] {
  return items
    .filter((x) => x.media.regionMain === "jeju")
    .slice(0, n)
    .map(
      (x) =>
        `${x.media.name} (${x.score}) hotspot=${x.breakdown.hotspot ?? 0} tp=${x.breakdown.targetProfile ?? 0}`,
    );
}

test("STEP1 1안 golden: 3c hotspot vs 3b-only (no hotspots requested)", async (t) => {
  const catalog = await loadCatalog();
  if (!catalog?.length) {
    t.skip("DATABASE_URL catalog unavailable");
    return;
  }

  const aiInput = buildAiRecommendInputFromFreetextRaw(STEP1_1_RAW, true);
  assert.ok(aiInput, "parse input");

  const withHotspot = aiInputToMatching(aiInput!);
  assert.ok(withHotspot.targetProfile, "targetProfile parsed");
  assert.ok(withHotspot.requestedHotspots?.length, "requestedHotspots parsed");

  const withoutHotspot: typeof withHotspot = {
    ...withHotspot,
    requestedHotspots: undefined,
  };

  const jejuCatalog = catalog.filter((m) => m.regionMain === "jeju");
  const taggedCount = jejuCatalog.filter((m) => m.hotspotTags?.length).length;
  console.log("jeju catalog with DB hotspotTags:", taggedCount, "/", jejuCatalog.length);
  const only3b = matchMediaCatalog(jejuCatalog, withoutHotspot, 15);
  const with3c = matchMediaCatalog(jejuCatalog, withHotspot, 15);

  console.log("\n--- STEP1 1안 3c hotspot 효과 ---");
  console.log("requestedHotspots:", JSON.stringify(withHotspot.requestedHotspots));
  console.log("3b-only top10:\n  ", topJejuNames(only3b).join("\n  "));
  console.log("3c top10:\n  ", topJejuNames(with3c).join("\n  "));

  const airportRank3b = topJejuNames(only3b).findIndex((n) =>
    /공항|airport/i.test(n),
  );
  const airportRank3c = topJejuNames(with3c).findIndex((n) =>
    /공항|airport/i.test(n),
  );

  console.log("airport rank 3b-only / 3c:", airportRank3b, airportRank3c);

  assert.ok(only3b.length > 0);
  assert.ok(with3c.length > 0);

  if (airportRank3c >= 0 && airportRank3b >= 0) {
    assert.ok(
      airportRank3c > airportRank3b,
      `airport should drop in top10: 3b rank ${airportRank3b} → 3c rank ${airportRank3c}`,
    );
  }
});

test("non-jeju regression: hotspot input does not change seoul ranking", async (t) => {
  const catalog = await loadCatalog();
  if (!catalog?.length) {
    t.skip("DATABASE_URL catalog unavailable");
    return;
  }

  const baseInput = aiInputToMatching({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "seoul",
    industry: "other",
    regionCodes: ["seoul"],
  });

  const withJejuHotspot = {
    ...baseInput,
    requestedHotspots: [
      { regionId: "jeju", type: "residential" as const, weight: 1 },
    ],
  };

  const a = matchMediaCatalog(catalog, baseInput, 20);
  const b = matchMediaCatalog(catalog, withJejuHotspot, 20);

  assert.deepEqual(
    a.map((x) => x.media.id),
    b.map((x) => x.media.id),
    "seoul catalog order must be identical with jeju hotspot request",
  );
});
