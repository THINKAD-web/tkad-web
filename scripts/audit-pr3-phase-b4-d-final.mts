#!/usr/bin/env npx tsx
/**
 * Phase B 4단계 D 최종 — 비율 임계 ×50 재산출 (읽기 전용, 플래그 없음).
 *
 *   npx tsx scripts/audit-pr3-phase-b4-d-final.mts
 *
 * Phase A 쓰기 경고(×31)는 변경하지 않는다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { csvEscape } from "../lib/phase-b-catalog-audit.ts";
import { classifyForMetricsWrite } from "../lib/media-metrics-write.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const D31 = 31;
const D50 = 50;
const GOLF_MEDIA_BAR_ID = "cmp3v92yy000004jr7i6ykgy1";

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
    const medias = await db.media.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
        widthM: true,
        heightM: true,
        impressions: true,
        dailyFootfall: true,
        updatedAt: true,
        ownerUserId: true,
      },
    });

    type Row = {
      mediaId: string;
      mediaName: string;
      impressions: number;
      dailyFootfall: number;
      ratio: number;
      lastUpdatedAt: string;
      lastUpdatedBy: string;
    };

    const eligible: Row[] = [];
    for (const m of medias) {
      if (m.impressions == null || m.dailyFootfall == null) continue;
      if (m.impressions <= 0 || m.dailyFootfall <= 0) continue;
      eligible.push({
        mediaId: m.id,
        mediaName: m.name,
        impressions: m.impressions,
        dailyFootfall: m.dailyFootfall,
        ratio: m.impressions / m.dailyFootfall,
        lastUpdatedAt: m.updatedAt.toISOString(),
        lastUpdatedBy: m.ownerUserId ?? "",
      });
    }

    const d31 = eligible.filter((r) => r.ratio > D31);
    const d50 = eligible
      .filter((r) => r.ratio > D50)
      .sort((a, b) => b.ratio - a.ratio);

    const golf = medias.find((m) => m.id === GOLF_MEDIA_BAR_ID);
    const golfClass = golf
      ? classifyForMetricsWrite({
          name: golf.name,
          type: golf.type,
          mainCategory: golf.mediaMainCategory,
          subCategory: golf.mediaSubCategory ?? golf.subCategory,
          widthM: golf.widthM,
          heightM: golf.heightM,
        })
      : null;
    const golfRow = eligible.find((r) => r.mediaId === GOLF_MEDIA_BAR_ID);
    const golfInD50 = d50.some((r) => r.mediaId === GOLF_MEDIA_BAR_ID);

    const header = [
      "mediaId",
      "mediaName",
      "violationCode",
      "currentValue",
      "capOrThreshold",
      "network",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "ratio",
    ];
    const lines = [header.join(",")];
    for (const r of d50) {
      lines.push(
        [
          csvEscape(r.mediaId),
          csvEscape(r.mediaName),
          "D",
          csvEscape(
            `impressions=${r.impressions};dailyFootfall=${r.dailyFootfall}`,
          ),
          csvEscape(`impressions>dailyFootfall×${D50}`),
          "",
          csvEscape(r.lastUpdatedAt),
          csvEscape(r.lastUpdatedBy),
          csvEscape(r.ratio.toFixed(2)),
        ].join(","),
      );
    }
    lines.push("");
    lines.push("# 분류 오류 의심 — D 판정과 무관");
    lines.push(
      `# ${GOLF_MEDIA_BAR_ID} | ${golf?.name ?? "골프장 미디어바 광고"} | type=${golf?.type ?? ""} | mediaMainCategory=${golf?.mediaMainCategory ?? ""} | mediaSubCategory=${golf?.mediaSubCategory ?? ""} | classifyForMetricsWrite=${golfClass ?? ""} | ratio=${golfRow ? golfRow.ratio.toFixed(2) : "n/a"} | in_D50=${golfInD50}`,
    );
    lines.push(
      "# 이동형(type=mobile) 골프장 미디어바인데 subway_psd 로 분류됨. D ×50 포함 여부와 별개로 분류 로직 버그.",
    );
    lines.push("");

    const outPath = resolve(root, "reports/phase-b-audit-report-d-final.csv");
    mkdirSync(resolve(root, "reports"), { recursive: true });
    writeFileSync(outPath, lines.join("\n"), "utf8");

    console.log(
      JSON.stringify(
        {
          d31: d31.length,
          d50: d50.length,
          outPath,
          golfInD50,
          golfClass,
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
