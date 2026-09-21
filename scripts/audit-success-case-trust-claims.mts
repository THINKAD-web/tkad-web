/**
 * 성공 사례 — 근거 미상·과장 소지 문구 추출 (읽기 전용).
 *
 * Usage:
 *   npx tsx scripts/audit-success-case-trust-claims.mts
 *   npx tsx scripts/audit-success-case-trust-claims.mts --out=reports/success-case-trust-claims.json
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  extractTrustClaimHitsFromSuccessCaseFields,
  isSeedSuccessCaseMetrics,
} from "../lib/success-case-trust-claims.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

function parseOutArg(): string {
  const arg = process.argv.find((a) => a.startsWith("--out="));
  return arg?.slice("--out=".length) ?? "reports/success-case-trust-claims-audit.json";
}

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.successCase.findMany({
    where: { status: "published" },
    select: {
      id: true,
      titleKo: true,
      summaryKo: true,
      challengeKo: true,
      solutionKo: true,
      resultsKo: true,
      metricsJson: true,
      campaignId: true,
      mediaIds: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  const cases = rows.map((row) => {
    const seed = isSeedSuccessCaseMetrics(row.metricsJson);
    const hits = extractTrustClaimHitsFromSuccessCaseFields({
      id: row.id,
      titleKo: row.titleKo,
      summaryKo: row.summaryKo,
      challengeKo: row.challengeKo,
      solutionKo: row.solutionKo,
      resultsKo: row.resultsKo ?? [],
      metricsJson: row.metricsJson,
    });
    return {
      id: row.id,
      titleKo: row.titleKo,
      seed,
      campaignId: row.campaignId,
      mediaIdsCount: (row.mediaIds ?? []).length,
      hitCount: hits.length,
      hits,
    };
  });

  const withHits = cases.filter((c) => c.hitCount > 0);
  const seedWithHits = withHits.filter((c) => c.seed);

  const report = {
    generatedAt: new Date().toISOString(),
    publishedCount: rows.length,
    casesWithHits: withHits.length,
    seedCasesWithHits: seedWithHits.length,
    cases: withHits,
  };

  const outPath = resolve(root, parseOutArg());
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote ${outPath} (${withHits.length} cases with hits)`);

  await db.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
