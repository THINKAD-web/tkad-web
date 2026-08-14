/**
 * TKAD 매체 지표 전수 감사 — **읽기 전용**.
 *
 * 표본 5건에서 관측된 결함(D-01~D-19)이 카탈로그 전체에 같은 패턴으로
 * 퍼져 있는지 확인한다. 규모를 모르는 상태로 마이그레이션하면 안 되므로
 * 이 리포트가 PR-3(스키마)·PR-4(데이터 이관)의 선행 조건이다.
 *
 * 이 스크립트는 DB 에 **절대 쓰지 않는다.** `findMany` 만 호출한다.
 * 판정 로직은 전부 `lib/metrics/audit-rules.ts` (순수 함수, 단위 테스트 있음).
 *
 * Usage:
 *   npm run audit:media
 *   npx tsx scripts/audit-media-metrics.ts --out=audit-report.json --limit=100
 *   npx tsx scripts/audit-media-metrics.ts --include-inactive
 *   DATABASE_URL="postgresql://..." npx tsx scripts/audit-media-metrics.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { METRICS_ENGINE_VERSION } from "../lib/metrics/constants.ts";
import {
  auditAll,
  RULES,
  SCHEMA_MISSING_FIELDS,
  topCpmOutliers,
  type AuditAccumulator,
  type AuditMediaRow,
  type RuleId,
} from "../lib/metrics/audit-rules.ts";
import {
  calculateMediaQuoteByDays,
  subscribeProductRateConflict,
  type ProductRateConflict,
} from "../lib/compare-quote.ts";
import type { MediaItem } from "../lib/media-data.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

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

function createPrisma(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL 이 없습니다. .env.local 에 추가하거나 인라인으로 전달하세요.\n" +
        '  DATABASE_URL="postgresql://..." npx tsx scripts/audit-media-metrics.ts',
    );
  }
  const pool = new Pool({ connectionString: normalizePgDatabaseUrl(url), max: 2 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

/** 한글·CJK 는 터미널에서 2칸을 차지한다 — 표 정렬용 실제 표시 너비 */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

function pad(label: string, width = 34): string {
  return `${label} ${".".repeat(Math.max(1, width - displayWidth(label)))}`;
}

const SEVERITY_TITLE = {
  P0: "신뢰도 붕괴",
  P1: "기능·데이터 결손",
  P2: "IA·품질",
} as const;

export function printSummary(
  total: number,
  acc: AuditAccumulator,
  conflicts: readonly ProductRateConflict[] = [],
): void {
  const { violations, fieldGaps, cpmSamples } = acc;

  const mediaByRule = new Map<RuleId, Set<string>>();
  for (const v of violations) {
    const set = mediaByRule.get(v.rule) ?? new Set<string>();
    set.add(v.mediaId);
    mediaByRule.set(v.rule, set);
  }

  console.log("\n=== TKAD 매체 지표 감사 ===");
  console.log(`엔진 버전: ${METRICS_ENGINE_VERSION}`);
  console.log(`총 매체: ${total.toLocaleString()}\n`);

  for (const severity of ["P0", "P1", "P2"] as const) {
    const rules = (Object.keys(RULES) as RuleId[]).filter(
      (r) => RULES[r].severity === severity,
    );
    if (rules.length === 0) continue;
    console.log(`[${severity}] ${SEVERITY_TITLE[severity]}`);
    for (const rule of rules) {
      const count = mediaByRule.get(rule)?.size ?? 0;
      const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
      console.log(
        `  ${rule} ${pad(RULES[rule].label)} ${String(count).padStart(5)}건 (${pct}%)`,
      );
    }
    console.log("");
  }

  console.log("[P1] 데이터 결손 (필드별)");
  for (const [field, count] of Object.entries(fieldGaps).sort(
    (a, b) => b[1] - a[1],
  )) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
    const note = (SCHEMA_MISSING_FIELDS as readonly string[]).includes(field)
      ? "  ← 스키마에 컬럼 없음 (PR-3에서 추가)"
      : "";
    console.log(
      `  ${pad(field, 28)} ${String(count).padStart(5)}건 (${pct}%)${note}`,
    );
  }

  const outliers = topCpmOutliers(cpmSamples, 20);
  console.log("\n상위 20개 이상치 (CPM 범위 이탈 배수 기준):");
  if (outliers.length === 0) console.log("  (없음)");
  for (const o of outliers) {
    console.log(
      `  ${o.ratio.toFixed(1).padStart(7)}x  ` +
        `₩${Math.round(o.cpm).toLocaleString().padStart(12)}  ` +
        `[정상 ₩${o.bounds[0].toLocaleString()}~₩${o.bounds[1].toLocaleString()}]  ` +
        `${o.mediaClass.padEnd(13)} ${o.name.slice(0, 34)}  (${o.slug ?? o.mediaId})`,
    );
  }

  const p0Media = new Set(
    violations.filter((v) => v.severity === "P0").map((v) => v.mediaId),
  );
  const p0Pct = total > 0 ? ((p0Media.size / total) * 100).toFixed(0) : "0";
  console.log(
    `\nP0 위반이 하나라도 있는 매체: ${p0Media.size.toLocaleString()} / ${total.toLocaleString()} (${p0Pct}%)`,
  );

  // R-7 — priceOptions 비어 있는 매체는 base 폐기 안전망이 없다.
  //       매체명·price·pricePeriod 를 전부 나열해 PR-4 정정 큐에 담는다.
  const baseOnly = violations.filter(
    (v) => v.rule === "R-05" && v.detail?.baseOnly === true,
  );
  if (baseOnly.length > 0) {
    console.log(
      `\n[R-7] priceOptions 비어 있고 base row 만 있는 매체: ${baseOnly.length}건 (전체의 ${((baseOnly.length / total) * 100).toFixed(0)}%)`,
    );
    console.log(
      `      → base 폐기 안전망이 동작하지 않으므로 pricePeriod 오라벨이 견적을 그대로 30배 부풀린다.`,
    );
    const risky = baseOnly.filter((v) => v.detail?.riskyPeriod === true);
    console.log(
      `      → 그중 day/week 이하 라벨(고위험): ${risky.length}건\n`,
    );
    console.log(
      `      ${"pricePeriod".padEnd(9)} ${"price".padStart(14)}  slug/id                              매체명`,
    );
    console.log(`      ${"-".repeat(90)}`);
    // 고위험 먼저, 그다음 나머지. 각 그룹당 최대 100건까지 보여준다 (PR-4 정정 큐 상한).
    const sorted = [
      ...risky.sort(
        (a, b) => (b.detail?.price as number) - (a.detail?.price as number),
      ),
      ...baseOnly
        .filter((v) => !risky.includes(v))
        .sort(
          (a, b) =>
            (b.detail?.price as number) - (a.detail?.price as number),
        ),
    ].slice(0, 100);
    for (const v of sorted) {
      const period = String(v.detail?.pricePeriod ?? "?");
      const price = (v.detail?.price as number) ?? 0;
      const flag = v.detail?.riskyPeriod ? " ⚠" : "  ";
      console.log(
        `     ${flag} ${period.padEnd(9)} ₩${price.toLocaleString().padStart(12)}  ` +
          `${(v.slug ?? v.mediaId).padEnd(36).slice(0, 36)} ${v.name.slice(0, 40)}`,
      );
    }
    if (baseOnly.length > sorted.length) {
      console.log(`      ... (+${baseOnly.length - sorted.length}건, JSON 리포트 참조)`);
    }
  }

  // R-3 — 상품가 vs 요율 5% 이상 벌어진 매체 (조용히 덮어쓰지 않았음을 로그로 남긴다)
  if (conflicts.length > 0) {
    console.log(
      `\n[R-3] 등록 상품가 vs 부분기간 요율 충돌: ${conflicts.length}건 (상품가를 사용)`,
    );
    const worst = conflicts
      .slice()
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 10);
    for (const c of worst) {
      console.log(
        `  ${(c.deviation * 100).toFixed(0).padStart(4)}%  ${c.days}일  ` +
          `상품 ₩${c.productWon.toLocaleString().padStart(12)}  vs  ` +
          `요율 ₩${c.rateWon.toLocaleString().padStart(12)}  ` +
          `${c.mediaName.slice(0, 34)}  (${c.mediaId})`,
      );
    }
  }
  console.log("\n※ 이 스크립트는 DB 에 쓰지 않습니다.");
  console.log("   PR-3(스키마)·PR-4(마이그레이션)는 이 리포트 검토 후에 진행하세요.");
  console.log(
    "   기존 즉시예약 amount 이상치 조사는 scripts/investigate-instant-booking-overcharge.sql 참조.\n",
  );
}

function parseArg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const outPath = resolve(root, parseArg("out") ?? "audit-report.json");
  const limitRaw = parseArg("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const includeInactive = process.argv.includes("--include-inactive");

  const prisma = createPrisma();
  try {
    const rows = (await prisma.media.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        region: true,
        regionMain: true,
        location: true,
        description: true,
        price: true,
        pricePeriod: true,
        priceOptions: true,
        priceNote: true,
        widthM: true,
        heightM: true,
        resolution: true,
        targetAge: true,
        dailyFootfall: true,
        impressions: true,
        cpm: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        latitude: true,
        tags: true,
        nearbyStations: true,
        nearbyLandmarks: true,
      },
      orderBy: { id: "asc" },
      ...(limit ? { take: limit } : {}),
    })) as unknown as AuditMediaRow[];

    const acc = auditAll(rows);

    // R-3 — 상품가 vs 요율 충돌을 30일 기준으로 프로브.
    // subscribeProductRateConflict 는 calculateMediaQuoteByDays 가 exact
    // 상품가와 partialPeriodRates 를 둘 다 갖고 있고 5% 넘게 벌어질 때 짖는다.
    const conflicts: ProductRateConflict[] = [];
    const unsub = subscribeProductRateConflict((c) => conflicts.push(c));
    for (const row of rows) {
      const media = row as unknown as MediaItem;
      for (const days of [7, 15, 30]) {
        try {
          calculateMediaQuoteByDays(media, days);
        } catch {
          /* 견적 산출 오류는 개별 매체 문제이며 감사를 중단하지 않는다 */
        }
      }
    }
    unsub();

    printSummary(rows.length, acc, conflicts);

    const report = {
      generatedAt: new Date().toISOString(),
      engineVersion: METRICS_ENGINE_VERSION,
      totalMedia: rows.length,
      includeInactive,
      rules: RULES,
      summary: (Object.keys(RULES) as RuleId[]).map((rule) => {
        const hits = acc.violations.filter((v) => v.rule === rule);
        return {
          rule,
          severity: RULES[rule].severity,
          label: RULES[rule].label,
          violations: hits.length,
          affectedMedia: new Set(hits.map((v) => v.mediaId)).size,
        };
      }),
      fieldGaps: acc.fieldGaps,
      schemaMissingFields: SCHEMA_MISSING_FIELDS,
      cpmOutliers: topCpmOutliers(acc.cpmSamples, 50),
      productRateConflicts: conflicts,
      violations: acc.violations,
      cpmSamples: acc.cpmSamples,
    };

    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`리포트 저장: ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

/** 직접 실행일 때만 DB 에 붙는다 (테스트에서 printSummary 만 import 가능하도록) */
const invokedDirectly =
  process.argv[1] != null &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
