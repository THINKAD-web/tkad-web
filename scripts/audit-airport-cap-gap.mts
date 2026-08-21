#!/usr/bin/env npx tsx
/**
 * airport cap(10M) vs subway_psd cap(15M) 갭 조회. 읽기 전용.
 *
 *   npx tsx scripts/audit-airport-cap-gap.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { csvEscape } from "../lib/phase-b-catalog-audit.ts";
import { PHASE_B_ABC_FLAG_IDS } from "../lib/media-review-status.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const AIRPORT_CAP = 10_000_000;
const SUBWAY_CAP = 15_000_000;
const AIRPORT_COPY =
  /공항|airport|t1|t2|터미널|여객|면세|국제선|국내선/i;

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

function inGap(n: number | null): boolean {
  return n != null && n > AIRPORT_CAP && n <= SUBWAY_CAP;
}

async function main() {
  const suspectsPath = resolve(root, "reports/classify-mismatch-suspects.csv");
  const raw = readFileSync(suspectsPath, "utf8");
  const ids = [
    ...new Set(
      [...raw.matchAll(/cm[a-z0-9]{20,}/gi)].map((m) => m[0]),
    ),
  ];

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
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        location: true,
        description: true,
        effectMemo: true,
        mediaSubCategory: true,
        impressions: true,
        dailyFootfall: true,
        reviewStatus: true,
      },
    });

    const uniqueAirport = medias.filter((m) =>
      AIRPORT_COPY.test(
        [m.name, m.location, m.description, m.effectMemo]
          .filter(Boolean)
          .join(" "),
      ),
    );

    const gap = uniqueAirport.filter(
      (m) => inGap(m.impressions) || inGap(m.dailyFootfall),
    );
    const abc = new Set(PHASE_B_ABC_FLAG_IDS);
    const gapNew = gap.filter((m) => !abc.has(m.id));
    const gapAbc = gap.filter((m) => abc.has(m.id));

    const header = [
      "mediaId",
      "mediaName",
      "mediaSubCategory(현재)",
      "impressions",
      "dailyFootfall",
      "airport cap 초과 여부",
      "subway_psd cap 초과 여부",
      "cohort",
    ];
    const lineFor = (m: (typeof gap)[number], cohort: string) => {
      const imp = m.impressions;
      const daily = m.dailyFootfall;
      const airportOver =
        (imp != null && imp > AIRPORT_CAP) ||
        (daily != null && daily > AIRPORT_CAP);
      const subwayOver =
        (imp != null && imp > SUBWAY_CAP) ||
        (daily != null && daily > SUBWAY_CAP);
      return [
        csvEscape(m.id),
        csvEscape(m.name),
        csvEscape(m.mediaSubCategory ?? ""),
        csvEscape(imp ?? ""),
        csvEscape(daily ?? ""),
        csvEscape(airportOver ? "Y" : "N"),
        csvEscape(subwayOver ? "Y" : "N"),
        csvEscape(cohort),
      ].join(",");
    };

    const lines = [header.join(",")];
    for (const m of gapNew) lines.push(lineFor(m, "new"));
    lines.push("");
    lines.push("# Phase B ABC 6건 (이미 처리 중) — 위 신규 건수에 포함하지 않음");
    if (gapAbc.length === 0) {
      lines.push("# (갭 구간에 해당하는 ABC 6건 없음)");
    } else {
      for (const m of gapAbc) lines.push(lineFor(m, "phaseB-abc-6"));
    }
    lines.push("");

    mkdirSync(resolve(root, "reports"), { recursive: true });
    writeFileSync(
      resolve(root, "reports/airport-cap-gap-candidates.csv"),
      lines.join("\n"),
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          suspects: ids.length,
          airportLike: uniqueAirport.length,
          gapTotal: gap.length,
          gapNew: gapNew.length,
          gapAbc6: gapAbc.length,
          newIds: gapNew.map((m) => ({ id: m.id, name: m.name, impressions: m.impressions, dailyFootfall: m.dailyFootfall })),
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
