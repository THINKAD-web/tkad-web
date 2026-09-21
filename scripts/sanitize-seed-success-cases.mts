/**
 * seed 성공 사례 — audit 규칙에 걸리는 resultsKo·본문 과장 수치 제거.
 *
 *   npx tsx scripts/sanitize-seed-success-cases.mts          # dry-run
 *   npx tsx scripts/sanitize-seed-success-cases.mts --apply
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  extractTrustClaimHitsFromSuccessCaseFields,
  isSeedSuccessCaseMetrics,
} from "../lib/success-case-trust-claims.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), override: true });

const apply = process.argv.includes("--apply");

function stripClaimLines(text: string, hitFields: Set<string>, field: string): string {
  if (!hitFields.has(field)) return text;
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const hits = extractTrustClaimHitsFromSuccessCaseFields({
      id: "",
      titleKo: "",
      summaryKo: "",
      challengeKo: "",
      solutionKo: "",
      resultsKo: [line],
      metricsJson: null,
    });
    return hits.length === 0;
  });
  return kept.join("\n").trim();
}

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.successCase.findMany({
    where: { status: "published" },
  });

  const plan = [];
  for (const row of rows) {
    if (!isSeedSuccessCaseMetrics(row.metricsJson)) continue;

    const hits = extractTrustClaimHitsFromSuccessCaseFields({
      id: row.id,
      titleKo: row.titleKo,
      summaryKo: row.summaryKo,
      challengeKo: row.challengeKo,
      solutionKo: row.solutionKo,
      resultsKo: row.resultsKo ?? [],
      metricsJson: row.metricsJson,
    });
    if (hits.length === 0) continue;

    const hitFields = new Set(hits.map((h) => h.field.replace(/\[\d+\]$/, "")));
    const resultsKo = (row.resultsKo ?? []).filter((line) => {
      const lineHits = extractTrustClaimHitsFromSuccessCaseFields({
        id: row.id,
        titleKo: row.titleKo,
        summaryKo: row.summaryKo,
        challengeKo: row.challengeKo,
        solutionKo: row.solutionKo,
        resultsKo: [line],
        metricsJson: row.metricsJson,
      });
      return lineHits.length === 0;
    });

    const challengeKo = stripClaimLines(
      row.challengeKo,
      hitFields,
      "challengeKo",
    );
    const solutionKo = stripClaimLines(
      row.solutionKo,
      hitFields,
      "solutionKo",
    );

    plan.push({
      id: row.id,
      titleKo: row.titleKo,
      hitCount: hits.length,
      resultsBefore: row.resultsKo?.length ?? 0,
      resultsAfter: resultsKo.length,
    });

    if (apply) {
      await db.successCase.update({
        where: { id: row.id },
        data: {
          resultsKo,
          challengeKo,
          solutionKo,
          metricsJson: {
            ...(typeof row.metricsJson === "object" && row.metricsJson
              ? row.metricsJson
              : {}),
            sanitizedAt: new Date().toISOString(),
            sanitizedClaimHitsRemoved: hits.length,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      { apply, casesUpdated: plan.length, plan },
      null,
      2,
    ),
  );

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
