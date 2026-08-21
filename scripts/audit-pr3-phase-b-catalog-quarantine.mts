#!/usr/bin/env npx tsx
/**
 * Phase B 1단계 — 카탈로그 감사 (READ-ONLY, 값 미변경)
 *
 *   npx tsx scripts/audit-pr3-phase-b-catalog-quarantine.mts --verify-gbus
 *   npx tsx scripts/audit-pr3-phase-b-catalog-quarantine.mts
 *
 * --verify-gbus 만 통과한 뒤에 전체 CSV 를 쓴다.
 * 리포트 CSV 는 git 에 올리지 않는다 (사장님 파일 공유용).
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
  GBUS_TV_MEDIA_ID,
  auditCatalogMedia,
  auditNetwork,
  findingsToCsv,
  type PhaseBAuditMedia,
  type PhaseBFinding,
} from "../lib/phase-b-catalog-audit.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const verifyGbusOnly = process.argv.includes("--verify-gbus");

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

function toAuditMedia(row: {
  id: string;
  name: string;
  type: string;
  description: string | null;
  priceNote: string | null;
  priceOptions: unknown;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  subCategory: string | null;
  widthM: number | null;
  heightM: number | null;
  dailyFootfall: number | null;
  impressions: number | null;
  updatedAt: Date;
  ownerUserId: string | null;
  isActive: boolean;
}): PhaseBAuditMedia {
  return row;
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL missing — read-only prod/local URL 필요");
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await db.$executeRawUnsafe("SET default_transaction_read_only = on");

    const gbus = await db.media.findUnique({
      where: { id: GBUS_TV_MEDIA_ID },
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
      },
    });

    if (!gbus) {
      throw new Error(
        `G버스 TV 샘플 없음: ${GBUS_TV_MEDIA_ID} — 로직 검증 전에 중단`,
      );
    }

    const gbusFindings = auditCatalogMedia(toAuditMedia(gbus));
    const gbusCodes = gbusFindings.map((f) => f.violationCode);
    console.log("[verify-gbus] row", {
      id: gbus.id,
      name: gbus.name,
      dailyFootfall: gbus.dailyFootfall,
      impressions: gbus.impressions,
      codes: gbusCodes,
      phaseA: gbusFindings[0]?.phaseACodes ?? gbusFindings.map((f) => f.phaseACodes),
    });

    if (!gbusCodes.includes("C")) {
      throw new Error(
        `G버스 TV 가 C(package+dailyFootfall≥2M)로 안 잡힘. codes=${gbusCodes.join(",")}`,
      );
    }
    if (gbusCodes.includes("B")) {
      throw new Error("G버스 TV 가 subway B 로 오탐");
    }
    console.log("[verify-gbus] OK — C 탐지, B 오탐 없음");

    if (verifyGbusOnly) {
      return;
    }

    const medias = await db.media.findMany({
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
      },
    });

    const networks = await db.mediaNetwork.findMany({
      select: {
        id: true,
        name: true,
        dailyFootfall: true,
        updatedAt: true,
        isActive: true,
      },
    });

    const catalogFindings: PhaseBFinding[] = [];
    for (const m of medias) {
      catalogFindings.push(...auditCatalogMedia(toAuditMedia(m)));
    }

    const networkFindings: PhaseBFinding[] = [];
    for (const n of networks) {
      networkFindings.push(
        ...auditNetwork({
          id: n.id,
          name: n.name,
          dailyFootfall: n.dailyFootfall,
          updatedAt: n.updatedAt,
          isActive: n.isActive,
          memberImpressionsSum: 0,
          linkedMediaIds: [],
        }),
      );
    }

    const all = [...networkFindings, ...catalogFindings];
    const abc = all.filter((f) => f.violationCode === "A" || f.violationCode === "B" || f.violationCode === "C");
    const dOnly = all.filter((f) => f.violationCode === "D");
    const eOnly = all.filter((f) => f.violationCode === "E");

    const outDir = resolve(root, "reports");
    mkdirSync(outDir, { recursive: true });
    const abcPath = resolve(outDir, "phase-b-audit-report.csv");
    const dPath = resolve(outDir, "phase-b-audit-report-d.csv");
    const ePath = resolve(outDir, "phase-b-audit-report-e.csv");
    writeFileSync(abcPath, findingsToCsv(abc));
    writeFileSync(dPath, findingsToCsv(dOnly));
    writeFileSync(ePath, findingsToCsv(eOnly));

    const count = (code: string) => all.filter((f) => f.violationCode === code).length;
    const gbusInAbc = abc.some((f) => f.mediaId === GBUS_TV_MEDIA_ID);
    const summary = [
      "# Phase B 1단계 감사 요약 (읽기 전용)",
      "",
      "값 미변경. reviewStatus 컬럼은 스키마에 없음 (2단계 후보).",
      "",
      "## Prisma 매핑",
      "",
      "| 논리명 | 실제 필드 | 모델 |",
      "|---|---|---|",
      "| impressions | `Media.impressions` | Media |",
      "| dailyFootfall | `Media.dailyFootfall` → `daily_footfall` | Media |",
      "| network cap | `MediaNetwork.dailyFootfall` | MediaNetwork (#428 `validateNetworkAggregateFootfall`) |",
      "| subway | `classifyForMetricsWrite` → subway_psd / subway_light | #428 |",
      "| Package | `detectPackageNetworkKeyword` (타입 컬럼 없음) | #428 |",
      "| lastUpdatedAt | `updatedAt` | Media / MediaNetwork |",
      "| lastUpdatedBy | 없음. CSV는 `ownerUserId` 또는 공란 | |",
      "| reviewStatus | **없음** | Phase 2 |",
      "",
      "## 건수",
      "",
      `| A network-cap | ${count("A")} |`,
      `| B subway 15M | ${count("B")} |`,
      `| C package+dailyFootfall≥2M | ${count("C")} |`,
      `| D ratio (참고, 별도 CSV) | ${count("D")} |`,
      `| E null/negative (별도 CSV) | ${count("E")} |`,
      `| catalog rows scanned | ${medias.length} |`,
      `| networks scanned | ${networks.length} |`,
      `| G버스 TV in A/B/C CSV | ${gbusInAbc} |`,
      "",
      `ABC: \`${abcPath}\``,
      `D: \`${dPath}\``,
      `E: \`${ePath}\``,
      "",
    ].join("\n");

    const mdPath = resolve(outDir, "phase-b-audit-summary.md");
    writeFileSync(mdPath, summary);
    console.log(summary);

    if (!gbusInAbc) {
      throw new Error("전체 리포트 ABC에 G버스 TV 없음");
    }
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
