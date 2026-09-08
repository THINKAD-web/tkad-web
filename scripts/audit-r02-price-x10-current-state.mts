#!/usr/bin/env npx tsx
/**
 * R-02 price ×10 — 현재 DB 상태 전수 대조 (읽기 전용, 쓰기 없음).
 *
 * 배경: reports/dry-run-r02-price-x10.json 의 423건 approve_candidate가
 * 실제로 반영됐는지 이 레포 히스토리(git log, PR, reports/ 실행 리포트)
 * 어디에도 흔적이 없었음. 관리자 페이지에서 합정역 CM보드
 * (cmqste6hy00000akoxccqnmi5)를 직접 확인한 결과 post-fix(₩28,000,000)로
 * 확인됨 — 어딘가에서는 실행됐다는 뜻. 이 스크립트는 423건 전부를
 * 한 번에 대조해 "다 반영됐는지 / 일부만 반영됐는지 / 제3의 값인지"를
 * 가른다.
 *
 * 분류:
 *   A — 현재 price === correctedPrice (정상 반영)
 *   B — 현재 price === currentPrice   (pre-fix 그대로, 미반영)
 *   C — 둘 다 아님                    (다른 경로로 또 바뀌었거나 이상 케이스 — 최우선 확인)
 *   missing — id 자체가 DB에 없음(삭제됐거나 병합됐을 가능성)
 *
 * Usage (DB 접근 가능한 실제 환경에서):
 *   npx tsx --env-file=.env.vercel.production scripts/audit-r02-price-x10-current-state.mts
 *   npx tsx scripts/audit-r02-price-x10-current-state.mts --dry-run=reports/dry-run-r02-price-x10.json
 *
 * 쓰기 없음 — DB에도, 캐시에도 아무것도 바꾸지 않는다. 캐시 정리는
 * scripts/revalidate-r02-price-x10-cache.mts (이 스크립트의 출력을 입력으로 받음).
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

// Inlined rather than imported from ./lib/batch-execute-report.mts — bare
// specifiers don't resolve to .mts targets under this tsconfig (TS2307),
// and the explicit-extension form trips TS5097; not worth two script files
// disagreeing on which error to accept for a ~15-line helper.
function reportMeta(scriptRelativePath: string) {
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

function writeReport(root: string, outRelativePath: string, report: Record<string, unknown>) {
  mkdirSync(resolve(root, "reports"), { recursive: true });
  const outPath = resolve(root, outRelativePath);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
// R-02 실행 여부가 불확실한 대상은 production DB — 로컬/.env.local이 아니라
// .env.vercel.production을 기본으로 로드한다(execute-r02-price-x10.mts와 동일 관례).
config({ path: resolve(root, ".env.vercel.production"), override: true });

type DryRunRow = {
  id: string;
  slug: string | null;
  name: string;
  currentPrice: number;
  correctedPrice: number;
  currentCpm: number | null;
  correctedCpm: number | null;
  recommendation: string;
};

function parseArgs() {
  const dryRunPath =
    process.argv.find((a) => a.startsWith("--dry-run="))?.slice("--dry-run=".length) ??
    "reports/dry-run-r02-price-x10.json";
  return { dryRunPath };
}

type Row = {
  id: string;
  name: string;
  slug: string | null;
  preFixPrice: number;
  postFixPrice: number;
  currentPrice: number | null;
  currentCpm: number | null;
  updatedAt: string | null;
  reviewStatus: string | null;
  priceSnapshots: { price: number; note: string | null; effectiveFrom: string }[];
};

async function main() {
  const { dryRunPath } = parseArgs();
  const dryRun = JSON.parse(
    readFileSync(resolve(root, dryRunPath), "utf8"),
  ) as { rows: DryRunRow[] };

  const approved = dryRun.rows.filter(
    (r) => r.recommendation === "approve_candidate",
  );
  console.log(`Loaded ${approved.length} approve_candidate rows from ${dryRunPath}`);

  const databaseUrl =
    process.env.DATABASE_URL?.trim() || process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL missing — this must run in an environment with real DB access " +
        "(.env.vercel.production or equivalent).",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: normalizePgDatabaseUrl(databaseUrl), max: 3 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const ids = approved.map((r) => r.id);
    const current = await db.media.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        cpm: true,
        updatedAt: true,
        reviewStatus: true,
      },
    });
    const currentById = new Map(current.map((m) => [m.id, m]));

    const snapshots = await db.mediaPriceSnapshot.findMany({
      where: { mediaId: { in: ids } },
      orderBy: { effectiveFrom: "asc" },
      select: { mediaId: true, price: true, note: true, effectiveFrom: true },
    });
    const snapshotsById = new Map<string, typeof snapshots>();
    for (const s of snapshots) {
      const list = snapshotsById.get(s.mediaId) ?? [];
      list.push(s);
      snapshotsById.set(s.mediaId, list);
    }

    const groups: { A: Row[]; B: Row[]; C: Row[]; missing: Row[] } = {
      A: [],
      B: [],
      C: [],
      missing: [],
    };

    for (const r of approved) {
      const cur = currentById.get(r.id);
      const row: Row = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        preFixPrice: r.currentPrice,
        postFixPrice: r.correctedPrice,
        currentPrice: cur?.price ?? null,
        currentCpm: cur?.cpm ?? null,
        updatedAt: cur?.updatedAt?.toISOString() ?? null,
        reviewStatus: cur?.reviewStatus ?? null,
        priceSnapshots: (snapshotsById.get(r.id) ?? []).map((s) => ({
          price: s.price,
          note: s.note,
          effectiveFrom: s.effectiveFrom.toISOString(),
        })),
      };

      if (!cur) {
        groups.missing.push(row);
      } else if (cur.price === r.correctedPrice) {
        groups.A.push(row);
      } else if (cur.price === r.currentPrice) {
        groups.B.push(row);
      } else {
        groups.C.push(row);
      }
    }

    console.log("\n=== R-02 현재 DB 상태 대조 ===");
    console.log(`A (정상 반영, post-fix):     ${groups.A.length}`);
    console.log(`B (미반영, pre-fix 그대로): ${groups.B.length}`);
    console.log(`C (제3의 값 — 최우선 확인): ${groups.C.length}`);
    console.log(`missing (DB에 id 없음):     ${groups.missing.length}`);

    if (groups.C.length > 0) {
      console.log("\n--- C그룹 (제3의 값) 샘플 ---");
      for (const row of groups.C.slice(0, 10)) {
        console.log(
          `  [${row.id}] ${row.name} — pre=${row.preFixPrice} post=${row.postFixPrice} current=${row.currentPrice} (updatedAt=${row.updatedAt})`,
        );
      }
    }
    if (groups.missing.length > 0) {
      console.log("\n--- missing 샘플 ---");
      for (const row of groups.missing.slice(0, 10)) {
        console.log(`  [${row.id}] ${row.name}`);
      }
    }

    const report = {
      ...reportMeta("scripts/audit-r02-price-x10-current-state.mts"),
      dryRunSource: dryRunPath,
      totalApproveCandidates: approved.length,
      summary: {
        A: groups.A.length,
        B: groups.B.length,
        C: groups.C.length,
        missing: groups.missing.length,
      },
      groups,
    };

    const outPath = writeReport(
      root,
      "reports/r02-price-x10-current-state-audit.json",
      report,
    );
    console.log(`\nFull report written to ${outPath}`);
    console.log(
      "\nNext step (only after B/C rows are resolved, or immediately for A-only):\n" +
        "  npx tsx scripts/revalidate-r02-price-x10-cache.mts",
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
