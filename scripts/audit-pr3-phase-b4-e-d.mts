#!/usr/bin/env npx tsx
/**
 * Phase B 4단계 — E 노출/계산 영향 + D ×31 샘플 30건 (읽기 전용).
 *
 *   npx tsx scripts/audit-pr3-phase-b4-e-d.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  auditCatalogMedia,
  csvEscape,
  type PhaseBAuditMedia,
} from "../lib/phase-b-catalog-audit.ts";
import { classifyForMetricsWrite } from "../lib/media-metrics-write.ts";
import { MEDIA_REVIEW_STATUS } from "../lib/media-review-status.ts";
import { resolveMonthlyImpressions } from "../lib/media-metrics.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const SAMPLE_SEED = 20260820;

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

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quoteLineMonthly(impressions: number | null, dailyFootfall: number | null) {
  if (impressions != null && Number.isFinite(impressions) && impressions > 0) {
    return { monthly: impressions, quotePath: "stored_impressions" as const };
  }
  if (dailyFootfall != null && dailyFootfall > 0) {
    return {
      monthly: dailyFootfall * 30,
      quotePath: "dailyFootfall_x_30" as const,
    };
  }
  const monthly = resolveMonthlyImpressions({
    impressions: impressions ?? undefined,
    dailyFootTraffic: dailyFootfall ?? 0,
    price: 0,
  });
  return { monthly, quotePath: "resolveMonthlyImpressions_zero" as const };
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await db.$executeRawUnsafe("SET default_transaction_read_only = on");
    const rows = await db.media.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        priceNote: true,
        priceOptions: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
        widthM: true,
        heightM: true,
        dailyFootfall: true,
        impressions: true,
        updatedAt: true,
        ownerUserId: true,
        isActive: true,
        reviewStatus: true,
        location: true,
        region: true,
      },
    });

    const eRows: Array<{
      mediaId: string;
      name: string;
      field: string;
      currentValue: string;
      isActive: boolean;
      reviewStatus: string;
      publicCatalog: string;
      quoteImpact: string;
      aiRecommend: string;
      impressions: number | null;
      dailyFootfall: number | null;
    }> = [];

    const dRows: Array<{
      mediaId: string;
      name: string;
      impressions: number;
      dailyFootfall: number;
      ratio: number;
      mediaClass: string;
      mediaMainCategory: string | null;
      type: string | null;
      location: string;
      region: string;
      isActive: boolean;
      reviewStatus: string;
    }> = [];

    for (const row of rows) {
      const audit: PhaseBAuditMedia = {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        priceNote: row.priceNote,
        priceOptions: row.priceOptions,
        mediaMainCategory: row.mediaMainCategory,
        mediaSubCategory: row.mediaSubCategory,
        subCategory: row.subCategory,
        widthM: row.widthM,
        heightM: row.heightM,
        dailyFootfall: row.dailyFootfall,
        impressions: row.impressions,
        updatedAt: row.updatedAt,
        ownerUserId: row.ownerUserId,
        isActive: row.isActive,
      };
      const findings = auditCatalogMedia(audit);
      for (const f of findings) {
        if (f.violationCode !== "E") continue;
        const publicOn =
          row.isActive && row.reviewStatus !== MEDIA_REVIEW_STATUS.flagged;
        const q = quoteLineMonthly(row.impressions, row.dailyFootfall);
        const quoteImpact =
          q.monthly <= 0
            ? `0처리 (${q.quotePath}) — 견적 금액은 가격 필드로 계속 계산`
            : `폴백 ${q.monthly} (${q.quotePath})`;
        eRows.push({
          mediaId: row.id,
          name: row.name,
          field: f.currentValue,
          currentValue: f.currentValue,
          isActive: row.isActive,
          reviewStatus: row.reviewStatus,
          publicCatalog: publicOn ? "노출됨" : "안됨",
          quoteImpact,
          aiRecommend: publicOn
            ? "포함 (후보 풀=공개 카탈로그, impressions 미필터)"
            : "제외 (비공개/flagged)",
          impressions: row.impressions,
          dailyFootfall: row.dailyFootfall,
        });
      }
      for (const f of findings) {
        if (f.violationCode !== "D") continue;
        if (row.impressions == null || row.dailyFootfall == null) continue;
        if (row.dailyFootfall <= 0) continue;
        const mediaClass = classifyForMetricsWrite({
          name: row.name,
          type: row.type,
          mainCategory: row.mediaMainCategory,
          subCategory: row.mediaSubCategory ?? row.subCategory,
          widthM: row.widthM,
          heightM: row.heightM,
        });
        dRows.push({
          mediaId: row.id,
          name: row.name,
          impressions: row.impressions,
          dailyFootfall: row.dailyFootfall,
          ratio: row.impressions / row.dailyFootfall,
          mediaClass,
          mediaMainCategory: row.mediaMainCategory,
          type: row.type,
          location: row.location,
          region: row.region,
          isActive: row.isActive,
          reviewStatus: row.reviewStatus,
        });
      }
    }

    const eExposed = eRows.filter((r) => r.publicCatalog === "노출됨").length;
    const eInactive = eRows.filter((r) => !r.isActive).length;
    const eNegative = eRows.filter((r) => /impressions=-\d|dailyFootfall=-\d/.test(r.field)).length;
    const eImpNull = eRows.filter((r) => r.impressions == null).length;
    const eDailyNull = eRows.filter((r) => r.dailyFootfall == null).length;

    const sorted = [...dRows].sort((a, b) => a.ratio - b.ratio);
    const lowest10 = sorted.slice(0, 10).map((r) => ({ ...r, sampleBucket: "lowest10" }));
    const highest10 = sorted.slice(-10).reverse().map((r) => ({
      ...r,
      sampleBucket: "highest10",
    }));
    const taken = new Set([
      ...lowest10.map((r) => r.mediaId),
      ...highest10.map((r) => r.mediaId),
    ]);
    const rest = dRows.filter((r) => !taken.has(r.mediaId));
    const rng = mulberry32(SAMPLE_SEED);
    const shuffled = [...rest];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const random10 = shuffled.slice(0, 10).map((r) => ({
      ...r,
      sampleBucket: "random10_seed_20260820",
    }));
    const sample30 = [...lowest10, ...highest10, ...random10];

    const outDir = resolve(root, "reports");
    mkdirSync(outDir, { recursive: true });

    const eHeader = [
      "mediaId",
      "mediaName",
      "필드",
      "현재값",
      "isActive",
      "reviewStatus",
      "공개 카탈로그 노출",
      "견적 계산 영향",
      "AI 추천 포함",
    ];
    const eCsv = [
      eHeader.join(","),
      ...eRows.map((r) =>
        [
          csvEscape(r.mediaId),
          csvEscape(r.name),
          csvEscape(r.field),
          csvEscape(r.currentValue),
          csvEscape(String(r.isActive)),
          csvEscape(r.reviewStatus),
          csvEscape(r.publicCatalog),
          csvEscape(r.quoteImpact),
          csvEscape(r.aiRecommend),
        ].join(","),
      ),
      "",
    ].join("\n");
    writeFileSync(resolve(outDir, "phase-b-e-exposure.csv"), eCsv, "utf8");

    const dHeader = [
      "sampleBucket",
      "mediaId",
      "mediaName",
      "ratio",
      "impressions",
      "dailyFootfall",
      "mediaClass",
      "mediaMainCategory",
      "type",
      "location",
      "region",
      "isActive",
      "reviewStatus",
    ];
    const dCsv = [
      dHeader.join(","),
      ...sample30.map((r) =>
        [
          csvEscape(r.sampleBucket),
          csvEscape(r.mediaId),
          csvEscape(r.name),
          csvEscape(r.ratio.toFixed(2)),
          csvEscape(r.impressions),
          csvEscape(r.dailyFootfall),
          csvEscape(r.mediaClass),
          csvEscape(r.mediaMainCategory ?? ""),
          csvEscape(r.type ?? ""),
          csvEscape(r.location),
          csvEscape(r.region),
          csvEscape(String(r.isActive)),
          csvEscape(r.reviewStatus),
        ].join(","),
      ),
      "",
    ].join("\n");
    writeFileSync(resolve(outDir, "phase-b-d-sample-30.csv"), dCsv, "utf8");

    console.log(
      JSON.stringify(
        {
          e: {
            count: eRows.length,
            exposedPublic: eExposed,
            inactive: eInactive,
            negative: eNegative,
            impressionsNull: eImpNull,
            dailyFootfallNull: eDailyNull,
            alreadyFlagged: eRows.filter(
              (r) => r.reviewStatus === MEDIA_REVIEW_STATUS.flagged,
            ).length,
          },
          d: {
            count: dRows.length,
            sample: sample30.length,
            seed: SAMPLE_SEED,
            ratioMin: sorted[0]?.ratio ?? null,
            ratioMax: sorted[sorted.length - 1]?.ratio ?? null,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
