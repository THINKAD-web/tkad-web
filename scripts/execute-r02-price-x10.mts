#!/usr/bin/env npx tsx
/**
 * R-02 A-1 — price ×10 execute (approve_candidate only).
 *
 * Usage:
 *   npx tsx scripts/execute-r02-price-x10.mts --sample-review=25
 *   npx tsx scripts/execute-r02-price-x10.mts --execute
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { revalidateMediaCachesBulk } from "../lib/media-cache-revalidate.ts";
import {
  batchReportMeta,
  writeBatchExecuteReport,
} from "./lib/batch-execute-report.mts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

type DryRunRow = {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  currentPrice: number;
  correctedPrice: number;
  pricePeriod: string | null;
  priceOptions: unknown;
  currentCpm: number | null;
  correctedCpm: number | null;
  recommendation: string;
};

function parseArgs() {
  const execute = process.argv.includes("--execute");
  const sampleArg = process.argv.find((a) => a.startsWith("--sample-review"));
  const sampleCount = sampleArg
    ? Number(sampleArg.split("=")[1] ?? "25")
    : null;
  const dryRunPath =
    process.argv.find((a) => a.startsWith("--dry-run="))?.slice("--dry-run=".length) ??
    "reports/dry-run-r02-price-x10.json";
  return { execute, sampleCount, dryRunPath };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function loadApproveRows(dryRunPath: string): DryRunRow[] {
  const data = JSON.parse(readFileSync(resolve(root, dryRunPath), "utf8")) as {
    rows: DryRunRow[];
  };
  const approve = data.rows.filter((r) => r.recommendation === "approve_candidate");
  const excluded = data.rows.filter((r) => r.recommendation !== "approve_candidate");
  const reject = excluded.filter((r) => r.recommendation === "reject_not_in_bounds");
  const review = excluded.filter((r) => r.recommendation === "review_label_mismatch");
  console.log(
    JSON.stringify(
      {
        dryRunPath,
        approve: approve.length,
        excludedReject: reject.length,
        excludedReview: review.length,
      },
      null,
      2,
    ),
  );
  if (reject.length !== 128 || review.length !== 1) {
    console.warn(
      `WARN: expected 128 reject + 1 review, got ${reject.length} reject + ${review.length} review`,
    );
  }
  if (approve.length !== 423) {
    console.warn(`WARN: expected 423 approve rows, got ${approve.length}`);
  }
  return approve;
}

async function main() {
  const { execute, sampleCount, dryRunPath } = parseArgs();
  const approveRows = loadApproveRows(dryRunPath);

  if (sampleCount != null) {
    const sample = shuffle(approveRows).slice(0, sampleCount);
    console.log("\n=== SAMPLE REVIEW (manual eyeball) ===\n");
    for (const row of sample) {
      console.log(
        [
          `- ${row.name}`,
          `  id: ${row.id}`,
          `  type: ${row.type} · period: ${row.pricePeriod ?? "—"}`,
          `  price: ₩${row.currentPrice.toLocaleString("ko-KR")} → ₩${row.correctedPrice.toLocaleString("ko-KR")}`,
          `  CPM: ₩${row.currentCpm?.toLocaleString("ko-KR") ?? "—"} → ₩${row.correctedCpm?.toLocaleString("ko-KR") ?? "—"}`,
        ].join("\n"),
      );
    }
    console.log(`\nSampled ${sample.length} / ${approveRows.length} approve rows.`);
    if (!execute) return;
  }

  if (!execute) {
    console.log("\nDry-run mode — pass --execute to write. Use --sample-review=25 first.");
    return;
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const results: Array<Record<string, unknown>> = [];

  try {
    const BATCH_SIZE = 50;
    for (let i = 0; i < approveRows.length; i += BATCH_SIZE) {
      const batch = approveRows.slice(i, i + BATCH_SIZE);
      await db.$transaction(
        async (tx) => {
          for (const row of batch) {
            const before = await tx.media.findUnique({
              where: { id: row.id },
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                cpm: true,
                pricePeriod: true,
              },
            });
            if (!before) {
              results.push({ id: row.id, error: "not_found" });
              continue;
            }
            if (before.price !== row.currentPrice) {
              results.push({
                id: row.id,
                name: before.name,
                error: "price_drift",
                expected: row.currentPrice,
                actual: before.price,
              });
              throw new Error(
                `Price drift on ${before.name}: expected ${row.currentPrice}, got ${before.price}`,
              );
            }

            const afterPrice = row.correctedPrice;
            const afterCpm = row.correctedCpm;

            await tx.media.update({
              where: { id: row.id },
              data: {
                price: afterPrice,
                ...(afterCpm != null ? { cpm: afterCpm } : {}),
              },
            });

            results.push({
              id: row.id,
              slug: before.slug,
              name: before.name,
              priceBefore: before.price,
              priceAfter: afterPrice,
              cpmBefore: before.cpm,
              cpmAfter: afterCpm,
              pricePeriod: before.pricePeriod,
            });
          }
        },
        { maxWait: 30_000, timeout: 120_000 },
      );
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows committed`);
    }

    const cacheRefs = approveRows.map((r) => ({ id: r.id, slug: r.slug }));
    revalidateMediaCachesBulk(cacheRefs);

    const report = {
      ...batchReportMeta("scripts/execute-r02-price-x10.mts"),
      mode: "execute",
      dryRunSource: dryRunPath,
      targetCount: approveRows.length,
      executedCount: results.filter((r) => !r.error).length,
      excludedReject: 128,
      excludedReview: 1,
      cacheRevalidateBulk: cacheRefs.length,
      results,
    };

    const outPath = writeBatchExecuteReport(
      root,
      "reports/r02-price-x10-execute.json",
      report,
    );
    console.log(JSON.stringify({ outPath, ...report, results: undefined }, null, 2));
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
