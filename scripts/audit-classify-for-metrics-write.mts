#!/usr/bin/env npx tsx
/**
 * classifyForMetricsWrite 전수 점검 (읽기 전용). 값/플래그 미변경.
 *
 *   npx tsx scripts/audit-classify-for-metrics-write.mts
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
import { classifyMedia } from "../lib/metrics/classify.ts";
import { monthlyImpressionsCapForClass } from "../lib/media-metrics-write.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

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

const SUBWAY_NAME = /지하철|전철|스크린도어|\bpsd\b|안전문|메트로|metro|subway|신분당|호선/i;
const AIRPORT_NAME = /공항|airport|에어부산|기내/i;
const GOLF_NAME = /골프/i;
const BUS_NAME = /버스|bus|택시|taxi/i;
const NOT_SUBWAY_DESPITE_STATION_TAXONOMY =
  /공항|골프|버스|택시|피트니스|헬스|백화점|전광판|빌딩|호텔|시장|리조트/i;

function hay(name: string, location: string, description: string | null) {
  return `${name} ${location} ${description ?? ""}`;
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
        location: true,
        description: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
        widthM: true,
        heightM: true,
        isActive: true,
      },
    });

    type Row = {
      mediaId: string;
      name: string;
      type: string;
      location: string;
      mediaMainCategory: string | null;
      mediaSubCategory: string | null;
      legacySubCategory: string | null;
      mediaClass: string;
      nameOnlyClass: string;
      cap: number;
      isActive: boolean;
    };

    const rows: Row[] = [];
    const byClass = new Map<string, number>();
    const bySubThenClass = new Map<string, number>();

    for (const m of medias) {
      const mediaClass = classifyForMetricsWrite({
        name: m.name,
        type: m.type,
        mainCategory: m.mediaMainCategory,
        subCategory: m.mediaSubCategory ?? m.subCategory,
        widthM: m.widthM,
        heightM: m.heightM,
      });
      const nameOnlyClass = classifyMedia({ name: m.name });
      byClass.set(mediaClass, (byClass.get(mediaClass) ?? 0) + 1);
      const k = `${m.mediaSubCategory ?? "(null)"}→${mediaClass}`;
      bySubThenClass.set(k, (bySubThenClass.get(k) ?? 0) + 1);
      rows.push({
        mediaId: m.id,
        name: m.name,
        type: m.type,
        location: m.location,
        mediaMainCategory: m.mediaMainCategory,
        mediaSubCategory: m.mediaSubCategory,
        legacySubCategory: m.subCategory,
        mediaClass,
        nameOnlyClass,
        cap: monthlyImpressionsCapForClass(mediaClass),
        isActive: m.isActive,
      });
    }

    const suspects: Array<Row & { reason: string; direction: string }> = [];
    for (const m of medias) {
      const row = rows.find((r) => r.mediaId === m.id)!;
      const h = hay(m.name, m.location, m.description);
      const isSubwayClass =
        row.mediaClass === "subway_psd" || row.mediaClass === "subway_light";

      if (isSubwayClass && AIRPORT_NAME.test(h) && !SUBWAY_NAME.test(m.name)) {
        suspects.push({
          ...row,
          direction: "false_subway",
          reason: "airport-like name/location but subway class (taxonomy subway_station wins over name)",
        });
      } else if (isSubwayClass && GOLF_NAME.test(h)) {
        suspects.push({
          ...row,
          direction: "false_subway",
          reason: "golf media classified subway",
        });
      } else if (
        isSubwayClass &&
        row.mediaSubCategory === "subway_station" &&
        NOT_SUBWAY_DESPITE_STATION_TAXONOMY.test(m.name) &&
        !SUBWAY_NAME.test(m.name)
      ) {
        suspects.push({
          ...row,
          direction: "false_subway",
          reason: "subway_station taxonomy but name is not subway",
        });
      } else if (
        !isSubwayClass &&
        SUBWAY_NAME.test(m.name) &&
        row.mediaClass !== "bus_exterior"
      ) {
        suspects.push({
          ...row,
          direction: "missed_subway",
          reason: `name looks subway but class=${row.mediaClass} (sub=${row.mediaSubCategory})`,
        });
      } else if (
        AIRPORT_NAME.test(m.name) &&
        row.mediaClass !== "airport" &&
        !isSubwayClass
      ) {
        suspects.push({
          ...row,
          direction: "missed_airport",
          reason: `name looks airport but class=${row.mediaClass} (sub=${row.mediaSubCategory})`,
        });
      }
    }

    const known = [
      {
        id: "cmozef5v4000404l21zc780sn",
        withTaxonomy: classifyMedia({
          name: "인천공항 T1 Center Bridge",
          mainCategory: "transit",
          subCategory: "subway_station",
          type: "digital",
        }),
        nameOnly: classifyMedia({ name: "인천공항 T1 Center Bridge" }),
      },
      {
        id: "cmp3v92yy000004jr7i6ykgy1",
        withTaxonomy: classifyMedia({
          name: "골프장 미디어바 광고",
          mainCategory: "transit",
          subCategory: "subway_station",
          type: "mobile",
        }),
        nameOnly: classifyMedia({ name: "골프장 미디어바 광고" }),
      },
    ];

    const outDir = resolve(root, "reports");
    mkdirSync(outDir, { recursive: true });

    const allHeader = [
      "mediaId",
      "mediaName",
      "type",
      "mediaMainCategory",
      "mediaSubCategory",
      "legacySubCategory",
      "mediaClass",
      "nameOnlyClass",
      "monthlyCap",
      "isActive",
      "location",
    ];
    const allCsv = [
      allHeader.join(","),
      ...rows
        .sort((a, b) => a.mediaClass.localeCompare(b.mediaClass) || a.name.localeCompare(b.name, "ko"))
        .map((r) =>
          [
            csvEscape(r.mediaId),
            csvEscape(r.name),
            csvEscape(r.type),
            csvEscape(r.mediaMainCategory ?? ""),
            csvEscape(r.mediaSubCategory ?? ""),
            csvEscape(r.legacySubCategory ?? ""),
            csvEscape(r.mediaClass),
            csvEscape(r.nameOnlyClass),
            csvEscape(r.cap),
            csvEscape(String(r.isActive)),
            csvEscape(r.location),
          ].join(","),
        ),
      "",
    ].join("\n");
    writeFileSync(resolve(outDir, "classify-spotcheck-by-class.csv"), allCsv, "utf8");

    const susHeader = [
      "direction",
      "reason",
      "mediaId",
      "mediaName",
      "type",
      "mediaSubCategory",
      "mediaClass",
      "nameOnlyClass",
      "monthlyCap",
    ];
    const susCsv = [
      susHeader.join(","),
      ...suspects.map((r) =>
        [
          csvEscape(r.direction),
          csvEscape(r.reason),
          csvEscape(r.mediaId),
          csvEscape(r.name),
          csvEscape(r.type),
          csvEscape(r.mediaSubCategory ?? ""),
          csvEscape(r.mediaClass),
          csvEscape(r.nameOnlyClass),
          csvEscape(r.cap),
        ].join(","),
      ),
      "",
    ].join("\n");
    writeFileSync(resolve(outDir, "classify-mismatch-suspects.csv"), susCsv, "utf8");

    const falseSubway = suspects.filter((s) => s.direction === "false_subway");
    const missedSubway = suspects.filter((s) => s.direction === "missed_subway");
    const missedAirport = suspects.filter((s) => s.direction === "missed_airport");
    const subwayStationSub = rows.filter((r) => r.mediaSubCategory === "subway_station");

    console.log(
      JSON.stringify(
        {
          scanned: medias.length,
          byClass: Object.fromEntries([...byClass.entries()].sort()),
          subwayStationTaxonomyCount: subwayStationSub.length,
          knownRepro: known,
          suspects: {
            falseSubway: falseSubway.length,
            missedSubway: missedSubway.length,
            missedAirport: missedAirport.length,
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
