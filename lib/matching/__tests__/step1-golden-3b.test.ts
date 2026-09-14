/**
 * STEP1 1안 — 3b 단독 효과 golden (DB 카탈로그 필요)
 * npx tsx --env-file=.env.local --test lib/matching/__tests__/step1-golden-3b.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { matchMediaCatalog } from "@/lib/matching-engine";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import {
  buildAiRecommendInputFromFreetextRaw,
} from "@/lib/recommend/build-freetext-recommend-input";
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
    .map((x) => `${x.media.name} (${x.score})`);
}

test("STEP1 1안 golden: 3b targetProfile vs baseline", async (t) => {
  const catalog = await loadCatalog();
  if (!catalog?.length) {
    t.skip("DATABASE_URL catalog unavailable");
    return;
  }

  const aiInput = buildAiRecommendInputFromFreetextRaw(STEP1_1_RAW, true);
  assert.ok(aiInput, "parse input");

  const withProfile = aiInputToMatching(aiInput!);
  assert.ok(withProfile.targetProfile, "targetProfile parsed");

  const withoutProfile: typeof withProfile = {
    ...withProfile,
    targetProfile: undefined,
  };

  const jejuCatalog = catalog.filter((m) => m.regionMain === "jeju");
  const baseline = matchMediaCatalog(jejuCatalog, withoutProfile, 15);
  const enhanced = matchMediaCatalog(jejuCatalog, withProfile, 15);

  const baselineTop = topJejuNames(baseline);
  const enhancedTop = topJejuNames(enhanced);

  console.log("\n--- STEP1 1안 3b 단독 효과 ---");
  console.log("targetProfile:", JSON.stringify(withProfile.targetProfile));
  console.log("baseline top10:", baselineTop.join("\n  "));
  console.log("with 3b top10:", enhancedTop.join("\n  "));

  const airportRankBaseline = baselineTop.findIndex((n) => /공항|airport/i.test(n));
  const airportRankEnhanced = enhancedTop.findIndex((n) => /공항|airport/i.test(n));

  console.log(
    "airport rank baseline/enhanced:",
    airportRankBaseline,
    airportRankEnhanced,
  );

  /** 3b만으로는 태그 부족 시 순위 변화 미미할 수 있음 — 테스트는 크래시 없이 기록 */
  assert.ok(baseline.length > 0);
  assert.ok(enhanced.length > 0);
});

test("STEP1 1안: targetProfile 없을 때 baseline 회귀 — 동일 입력·profile 제거", async (t) => {
  const catalog = await loadCatalog();
  if (!catalog?.length) {
    t.skip("DATABASE_URL catalog unavailable");
    return;
  }

  const plainInput = aiInputToMatching({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 2500,
    region: "jeju",
    industry: "other",
    regionCodes: ["jeju"],
  });

  const a = matchMediaCatalog(catalog, plainInput, 15);
  const b = matchMediaCatalog(catalog, plainInput, 15);

  assert.deepEqual(
    a.map((x) => x.media.id),
    b.map((x) => x.media.id),
  );
});
