#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { buildEngineInput } from "../lib/media/engine/build-input.ts";
import { computeMetric } from "../lib/media/engine/compute.ts";
import { monthlyImpressionsFromOutput } from "../lib/media/engine/persist.ts";
import { shouldAutoRecomputeMediaMetrics } from "../lib/media/engine/auto-recompute.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const b1 = JSON.parse(
    readFileSync(resolve(root, "reports/flagged-a-group-batch1-execute.json"), "utf8"),
  );
  const b2 = JSON.parse(
    readFileSync(resolve(root, "reports/flagged-a-group-batch2-major-execute.json"), "utf8"),
  );
  const ids = [
    ...b1.results.map((r: { id: string }) => r.id),
    ...b2.results.map((r: { id: string }) => r.id),
  ];

  const rows = await db.media.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      reviewStatus: true,
      impressions: true,
      cpm: true,
      computedMetric: { select: { modelVersion: true } },
    },
  });

  let impMatch = 0;
  let cpmMatch = 0;
  const mismatches: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const exp = [...b1.results, ...b2.results].find(
      (r: { id: string }) => r.id === row.id,
    );
    const eImp = exp?.expectedMonthly ?? null;
    const eCpm = exp?.expectedCpm ?? null;
    if (row.impressions === eImp) impMatch++;
    if (row.cpm === eCpm) cpmMatch++;
    if (row.impressions !== eImp || row.cpm !== eCpm) {
      mismatches.push({
        id: row.id,
        impressions: row.impressions,
        expectedImpressions: eImp,
        cpm: row.cpm,
        expectedCpm: eCpm,
      });
    }
  }

  const clean = await db.media.findMany({
    where: {
      isActive: true,
      reviewStatus: { not: "flagged" },
      dailyFootfall: { gt: 0 },
      impressions: { gt: 0 },
    },
    include: { factSheet: true, externalSignals: true, computedMetric: true },
    take: 30,
    orderBy: { updatedAt: "desc" },
  });

  let hookTrigger = 0;
  let wouldChange = 0;
  for (const m of clean) {
    if (
      shouldAutoRecomputeMediaMetrics({
        dailyFootfall: m.dailyFootfall,
        impressions: m.impressions,
      })
    ) {
      hookTrigger++;
    }
    const { output } = computeMetric(buildEngineInput(m));
    if (monthlyImpressionsFromOutput(output) !== m.impressions) wouldChange++;
  }

  console.log(
    JSON.stringify(
      {
        batch: {
          expected: ids.length,
          found: rows.length,
          reviewed: rows.filter((r) => r.reviewStatus === "reviewed").length,
          v1: rows.filter((r) => r.computedMetric?.modelVersion === "v1-impressions")
            .length,
          impressionsMatch: impMatch,
          cpmMatch: cpmMatch,
          mismatches,
        },
        hookGuard: {
          cleanSample: clean.length,
          wouldTriggerOnSave: hookTrigger,
          wouldChangeIfForcedRecompute: wouldChange,
        },
      },
      null,
      2,
    ),
  );

  await db.$disconnect();
  await pool.end();
}

main();
