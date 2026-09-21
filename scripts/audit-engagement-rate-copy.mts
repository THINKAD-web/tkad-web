/**
 * 「참여율 65%」 등 engagement 수치 DB 전수 검색 (읽기 전용).
 *
 *   npx tsx scripts/audit-engagement-rate-copy.mts
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), override: true });

const TEXT_PATTERN = /참여율\s*[\d.]+\s*%|engagement\s*rate\s*[\d.]+\s*%|65\s*%/i;

function snippet(text: string, max = 120): string {
  const m = text.match(TEXT_PATTERN);
  if (!m || m.index == null) return text.slice(0, max);
  const start = Math.max(0, m.index - 30);
  return text.slice(start, start + max).replace(/\s+/g, " ").trim();
}

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL required");
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
    if (r.description?.match(TEXT_PATTERN)) {
      fields.push({ field: "description", text: snippet(r.description) });
    }
    if (r.effectMemo?.match(TEXT_PATTERN)) {
      fields.push({ field: "effectMemo", text: snippet(r.effectMemo) });
    }
    const rate = r.engagementRate;
    if (typeof rate === "number" && rate >= 0.64 && rate <= 0.66) {
      fields.push({
        field: "engagementRate",
        text: `engagementRate=${rate}`,
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
    if (TEXT_PATTERN.test(blob)) {
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
