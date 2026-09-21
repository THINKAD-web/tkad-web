/**
 * 「참여율 65%」 등 engagement 수치 DB 전수 검색 (읽기 전용).
 *
 *   npx tsx scripts/audit-engagement-rate-copy.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  ENGAGEMENT_RATE_COPY_PATTERN,
  isPlaceholderEngagementRate,
} from "../lib/engagement-rate-trust.ts";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { assertScriptDatabaseAccess } from "./lib/script-db-guard.mts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function snippet(text: string, max = 120): string {
  const m = text.match(ENGAGEMENT_RATE_COPY_PATTERN);
  if (!m || m.index == null) return text.slice(0, max);
  const start = Math.max(0, m.index - 30);
  return text.slice(start, start + max).replace(/\s+/g, " ").trim();
}

async function main() {
  const dbCtx = assertScriptDatabaseAccess({
    scriptName: "audit-engagement-rate-copy.mts",
  });

  const url = normalizePgDatabaseUrl(dbCtx.databaseUrl);
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      engagementRate: true,
      description: true,
      effectMemo: true,
    },
  });

  const hits = [];
  for (const r of rows) {
    const fields: Array<{ field: string; text: string }> = [];
    if (r.description?.match(ENGAGEMENT_RATE_COPY_PATTERN)) {
      fields.push({ field: "description", text: snippet(r.description) });
    }
    if (r.effectMemo?.match(ENGAGEMENT_RATE_COPY_PATTERN)) {
      fields.push({ field: "effectMemo", text: snippet(r.effectMemo) });
    }
    if (isPlaceholderEngagementRate(r.engagementRate)) {
      fields.push({
        field: "engagementRate",
        text: `engagementRate=${r.engagementRate}`,
      });
    }
    if (fields.length) {
      hits.push({ slug: r.slug, name: r.name, fields });
    }
  }

  const cases = await db.successCase.findMany({
    where: { status: "published" },
    select: {
      id: true,
      titleKo: true,
      resultsKo: true,
      solutionKo: true,
      challengeKo: true,
    },
  });

  const caseHits = [];
  for (const c of cases) {
    const blob = [c.challengeKo, c.solutionKo, ...c.resultsKo].join("\n");
    if (ENGAGEMENT_RATE_COPY_PATTERN.test(blob)) {
      caseHits.push({
        id: c.id,
        titleKo: c.titleKo,
        snippet: snippet(blob),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mediaHits: hits.length,
    caseHits: caseHits.length,
    hits,
    caseHits,
  };

  const out = resolve(root, "reports/engagement-rate-copy-audit.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
