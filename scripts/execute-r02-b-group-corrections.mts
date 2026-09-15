#!/usr/bin/env npx tsx
/**
 * R-02 B그룹(미반영 13건 중 사람이 결정한 항목) — 최종 확정값으로 price/cpm 반영.
 *
 * execute-r02-price-x10.mts 와 달리 dry-run JSON의 correctedPrice를 자동으로
 * 신뢰하지 않는다 — 이 13건은 대표값이 스캔 이후 바뀐(B그룹으로 분류된) 케이스라
 * dry-run 스냅샷 자체가 stale할 수 있음. 대신 사람이
 * reports/r02-manual-review-backlog.md 를 보고 직접 결정한 최종값을
 * decisions 입력 파일로 받아 그대로 쓴다. 즉 "과거 스냅샷이 아니라 현재
 * 대표값 기준으로 ×10"이라는 요구사항은 이 스크립트가 스냅샷을 아예
 * 참조하지 않는 구조로 해결한다.
 *
 * drift guard: DB 현재 price가 decisions 파일의 expectedCurrentPrice와
 * 다르면 그 행만 건너뛰고 report에 price_drift로 남긴다(전체 배치를
 * 막지 않되, 조용히 덮어쓰지도 않음).
 *
 * decisions 입력 스키마 (reports/r02-b-group-decisions.json):
 *   {
 *     "decisions": [
 *       {
 *         "id": "media id",
 *         "slug": "slug or null",
 *         "name": "표시용, 옵션",
 *         "expectedCurrentPrice": 45000000,
 *         "decidedPrice": 450000000,
 *         "decidedCpm": 12345,
 *         "note": "옵션 — 예: #7 현재 대표값(45M) 기준, 과거 스냅샷(60M) 아님"
 *       }
 *     ]
 *   }
 *
 * Usage:
 *   npx tsx scripts/execute-r02-b-group-corrections.mts                  # dry-run (미리보기만)
 *   npx tsx scripts/execute-r02-b-group-corrections.mts --execute        # 실제 반영
 *   npx tsx scripts/execute-r02-b-group-corrections.mts --execute --commit
 *     # 반영 + 실행 리포트를 그 자리에서 git commit까지 (요청하신 "실행 흔적 남기기")
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url";
import { revalidateMediaCachesAfterScript } from "./lib/revalidate-media-list-after-script";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

// Inlined rather than imported from ./lib/batch-execute-report.mts — bare
// specifiers don't resolve to .mts targets under this tsconfig (TS2307),
// and the explicit-extension form trips TS5097 (see
// audit-r02-price-x10-current-state.mts for the same tradeoff).
function batchReportMeta(scriptRelativePath: string) {
  let commitHash = "unknown";
  try {
    commitHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* not a git checkout */
  }
  return {
    executedAtUtc: new Date().toISOString(),
    executor: process.env.USER || userInfo().username || "unknown",
    script: scriptRelativePath,
    commitHash,
  };
}

function writeBatchExecuteReport(
  outRoot: string,
  outRelativePath: string,
  report: Record<string, unknown>,
) {
  mkdirSync(resolve(outRoot, "reports"), { recursive: true });
  const outPath = resolve(outRoot, outRelativePath);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

type Decision = {
  id: string;
  slug: string | null;
  name?: string;
  expectedCurrentPrice: number;
  decidedPrice: number;
  decidedCpm?: number | null;
  note?: string;
};

function parseArgs() {
  const execute = process.argv.includes("--execute");
  const doCommit = process.argv.includes("--commit");
  const inputPath =
    process.argv.find((a) => a.startsWith("--input="))?.slice("--input=".length) ??
    "reports/r02-b-group-decisions.json";
  return { execute, doCommit, inputPath };
}

async function main() {
  const { execute, doCommit, inputPath } = parseArgs();
  const parsed = JSON.parse(readFileSync(resolve(root, inputPath), "utf8")) as {
    decisions: Decision[];
  };
  const decisions = parsed.decisions;
  console.log(`Loaded ${decisions.length} decisions from ${inputPath}`);

  console.log("\n=== PREVIEW ===");
  for (const d of decisions) {
    console.log(
      `- [${d.id}] ${d.name ?? ""} — expectedCurrent=${d.expectedCurrentPrice.toLocaleString()} → decided=${d.decidedPrice.toLocaleString()}` +
        (d.decidedCpm != null ? ` (cpm→${d.decidedCpm})` : "") +
        (d.note ? `  // ${d.note}` : ""),
    );
  }

  if (!execute) {
    console.log("\nDry-run — pass --execute to write.");
    return;
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const results: Array<Record<string, unknown>> = [];

  try {
    for (const d of decisions) {
      const before = await db.media.findUnique({
        where: { id: d.id },
        select: { id: true, slug: true, name: true, price: true, cpm: true },
      });
      if (!before) {
        results.push({ id: d.id, error: "not_found" });
        continue;
      }
      if (before.price !== d.expectedCurrentPrice) {
        results.push({
          id: d.id,
          name: before.name,
          error: "price_drift",
          expected: d.expectedCurrentPrice,
          actual: before.price,
        });
        console.warn(
          `SKIP (price drift): ${before.name} — expected ${d.expectedCurrentPrice}, DB has ${before.price}`,
        );
        continue;
      }

      await db.media.update({
        where: { id: d.id },
        data: {
          price: d.decidedPrice,
          ...(d.decidedCpm != null ? { cpm: d.decidedCpm } : {}),
        },
      });

      results.push({
        id: d.id,
        slug: before.slug,
        name: before.name,
        priceBefore: before.price,
        priceAfter: d.decidedPrice,
        cpmBefore: before.cpm,
        cpmAfter: d.decidedCpm ?? before.cpm,
        note: d.note ?? null,
      });
      console.log(`OK: ${before.name} — ${before.price.toLocaleString()} → ${d.decidedPrice.toLocaleString()}`);
    }

    const applied = results.filter((r) => !r.error);
    const cacheRefs = applied.map((r) => ({
      id: r.id as string,
      slug: r.slug as string | null,
    }));
    await revalidateMediaCachesAfterScript(cacheRefs);

    const report = {
      ...batchReportMeta("scripts/execute-r02-b-group-corrections.mts"),
      mode: "execute",
      decisionsSource: inputPath,
      targetCount: decisions.length,
      appliedCount: applied.length,
      skippedDrift: results.filter((r) => r.error === "price_drift").length,
      notFound: results.filter((r) => r.error === "not_found").length,
      cacheRevalidateBulk: cacheRefs.length,
      results,
    };

    const outPath = writeBatchExecuteReport(
      root,
      "reports/r02-b-group-corrections-execute.json",
      report,
    );
    console.log(`\nReport written to ${outPath}`);
    console.log(JSON.stringify({ ...report, results: undefined }, null, 2));

    if (doCommit) {
      try {
        execSync(`git add ${outPath}`, { cwd: root });
        execSync(
          `git commit -m "R-02 B그룹 ${applied.length}건 수동 확정값 반영 실행 리포트"`,
          { cwd: root },
        );
        console.log("\n실행 리포트 커밋 완료.");
      } catch (e) {
        console.warn(
          "\n리포트 커밋 실패 — 수동으로 git add/commit 해주세요:",
          e instanceof Error ? e.message : e,
        );
      }
    } else {
      console.log(
        `\n--commit 플래그 없이 실행됨 — ${outPath} 를 지금 바로 git add/commit 해주세요 ` +
          "(리포트가 로컬에만 남고 커밋되지 않으면 이번 조사에서 발견한 " +
          "'실행 흔적 없음' 문제가 반복됩니다).",
      );
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
