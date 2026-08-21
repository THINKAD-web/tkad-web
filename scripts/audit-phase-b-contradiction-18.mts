#!/usr/bin/env npx tsx
/**
 * Phase B 6단계 — 내부 모순 18건 워크시트. 읽기 전용.
 *
 *   npx tsx scripts/audit-phase-b-contradiction-18.mts
 */
import { writeFileSync, mkdirSync } from "node:fs";
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

const REL_TOL = 0.1;
const TOP_N = 20;

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

function decodeUrl(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return raw.normalize("NFC");
  }
}

function isProposalAssetUrl(raw: string): boolean {
  const u = decodeUrl(raw).toLowerCase();
  if (!u.trim()) return false;
  if (/\/tkad\/proposals\//.test(u)) return true;
  if (/\.pdf(\?|#|$)/.test(u)) return true;
  if (/제안서|매체제안서/.test(u)) return true;
  if (/proposal/.test(u) && /\.(jpe?g|png|webp|gif|pdf)(\?|#|$)/.test(u)) {
    return true;
  }
  return false;
}

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function close(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) <= REL_TOL;
}

function parseKoMagnitude(digits: string, unit: string | undefined): number | null {
  const n = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === "억") return n * 100_000_000;
  if (unit === "만") return n * 10_000;
  return n;
}

function flattenCopy(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function extractAudienceNumbers(text: string): {
  monthly: { value: number; snip: string }[];
  daily: { value: number; snip: string }[];
} {
  const monthly: { value: number; snip: string }[] = [];
  const daily: { value: number; snip: string }[] = [];
  if (!text) return { monthly, daily };

  const push = (
    arr: { value: number; snip: string }[],
    v: number | null,
    snip: string,
  ) => {
    if (v == null || v < 100) return;
    arr.push({ value: v, snip });
  };

  for (const m of text.matchAll(
    /월\s*(?:평균\s*)?(?:승하차|이용|유동|노출)?\s*(?:평균\s*)?([\d,.]+)\s*(만|억)?\s*(명)?/g,
  )) {
    const start = m.index ?? 0;
    const after = text.slice(start + m[0].length, start + m[0].length + 6);
    const window = text.slice(start, start + m[0].length + 6);
    if (/원|VAT|₩/.test(window) || /^원/.test(after)) continue;
    if (/구좌/.test(window)) continue;
    if (/수[십백천만]/.test(m[0])) continue;
    if (!m[2] && !m[3]) continue;
    push(monthly, parseKoMagnitude(m[1]!, m[2]), m[0]);
  }

  for (const m of text.matchAll(
    /(하루|일일|일\s*평균|일평균)\s*(?:약\s*|평균\s*)*([\d,.]+)\s*(만|억)?\s*(명)/g,
  )) {
    const raw = m[0];
    if (/원|VAT|₩|만원|구좌/.test(raw)) continue;
    if (/수[십백천만]/.test(raw)) continue;
    push(daily, parseKoMagnitude(m[2]!, m[3]), raw);
  }

  return { monthly, daily };
}

function contextAround(text: string, needle: string, pad = 90): string {
  if (!needle) return text.slice(0, 220);
  const i = text.indexOf(needle);
  if (i < 0) return text.slice(0, 220);
  const from = Math.max(0, i - pad);
  const to = Math.min(text.length, i + needle.length + pad);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < text.length ? "…" : "";
  return `${prefix}${text.slice(from, to)}${suffix}`;
}

function nearTarget(x: number, targets: number[]): number | null {
  for (const t of targets) {
    if (Math.abs(x - t) / t <= REL_TOL) return t;
  }
  return null;
}

function contradictionType(mismatchRatio: number | null): string {
  if (mismatchRatio == null || !Number.isFinite(mismatchRatio) || mismatchRatio <= 0) {
    return "OTHER";
  }
  const inv = 1 / mismatchRatio;
  const unit = [30, 365, 12];
  const mag = [10, 100, 1000];
  if (nearTarget(mismatchRatio, unit) || nearTarget(inv, unit)) return "UNIT_SUSPECT";
  if (nearTarget(mismatchRatio, mag) || nearTarget(inv, mag)) {
    return "MAGNITUDE_SUSPECT";
  }
  return "OTHER";
}

async function main() {
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
      select: {
        id: true,
        name: true,
        description: true,
        effectMemo: true,
        priceNote: true,
        impressions: true,
        dailyFootfall: true,
        price: true,
        cpm: true,
        hasProposal: true,
        proposalUrl: true,
        image: true,
        extractedImages: true,
        mediaSubCategory: true,
        reviewStatus: true,
        reviewReason: true,
      },
    });

    type Row = {
      mediaId: string;
      mediaName: string;
      group: 1 | 2;
      ratio: number;
      impressions: number;
      dailyFootfall: number;
      computedDailyX30: number;
      copyClaimedValue: number | null;
      copyRawText: string;
      copyMismatchReasons: string;
      mismatchRatio: number | null;
      contradictionType: string;
      hasProposal: boolean;
      galleryProposalCount: number;
      galleryProposalPaths: string;
      mediaSubCategory: string;
      reviewStatus: string;
      alreadyAbc6: boolean;
    };

    const eligible: {
      m: (typeof medias)[number];
      ratio: number;
      reasons: string[];
      extracted: ReturnType<typeof extractAudienceNumbers>;
      copy: string;
      galleryHits: string[];
    }[] = [];

    for (const m of medias) {
      if (m.impressions == null || m.dailyFootfall == null) continue;
      if (m.impressions <= 0 || m.dailyFootfall <= 0) continue;
      const ratio = m.impressions / m.dailyFootfall;
      if (ratio <= 50) continue;
      const copy = flattenCopy(m.description, m.effectMemo, m.priceNote);
      const extracted = extractAudienceNumbers(copy);
      const dailyX30 = m.dailyFootfall * 30;
      const reasons: string[] = [];
      if (
        extracted.monthly.length > 0 &&
        !extracted.monthly.some((x) => close(x.value, dailyX30))
      ) {
        reasons.push("카피월≠daily×30");
      }
      if (
        extracted.daily.length > 0 &&
        !extracted.daily.some((x) => close(x.value, m.dailyFootfall!))
      ) {
        reasons.push("카피일≠dailyFootfall");
      }
      if (m.price != null && m.price >= 100_000 && m.price === m.impressions) {
        reasons.push("price=impressions");
      }
      if (m.cpm != null && m.cpm <= 10 && (m.price ?? 0) > 0) {
        reasons.push("cpm≤10(placeholder)");
      }
      if (reasons.length === 0) continue;
      const galleryHits = uniqueNonEmpty([
        m.image,
        ...(m.extractedImages ?? []),
      ]).filter(isProposalAssetUrl);
      eligible.push({ m, ratio, reasons, extracted, copy, galleryHits });
    }

    eligible.sort((a, b) => b.ratio - a.ratio);
    const dFinal = medias
      .filter(
        (m) =>
          m.impressions != null &&
          m.dailyFootfall != null &&
          m.impressions > 0 &&
          m.dailyFootfall > 0 &&
          m.impressions / m.dailyFootfall > 50,
      )
      .sort(
        (a, b) =>
          b.impressions! / b.dailyFootfall! - a.impressions! / a.dailyFootfall!,
      );
    const top20Ids = new Set(dFinal.slice(0, TOP_N).map((m) => m.id));

    const rows: Row[] = eligible.map((e) => {
      const dailyX30 = e.m.dailyFootfall! * 30;
      const group: 1 | 2 = top20Ids.has(e.m.id) ? 1 : 2;
      let copyClaimedValue: number | null = null;
      let needle = "";
      if (e.reasons.includes("카피월≠daily×30") && e.extracted.monthly[0]) {
        copyClaimedValue = e.extracted.monthly[0].value;
        needle = e.extracted.monthly[0].snip;
      } else if (e.reasons.includes("카피일≠dailyFootfall") && e.extracted.daily[0]) {
        copyClaimedValue = e.extracted.daily[0].value;
        needle = e.extracted.daily[0].snip;
      }
      const mismatchRatio =
        copyClaimedValue != null ? copyClaimedValue / dailyX30 : null;
      const copyRawText = needle
        ? contextAround(e.copy, needle)
        : e.copy
          ? `파싱실패/카피숫자없음 — 원문: ${e.copy.slice(0, 280)}${e.copy.length > 280 ? "…" : ""}`
          : "";

      return {
        mediaId: e.m.id,
        mediaName: e.m.name,
        group,
        ratio: Number(e.ratio.toFixed(2)),
        impressions: e.m.impressions!,
        dailyFootfall: e.m.dailyFootfall!,
        computedDailyX30: dailyX30,
        copyClaimedValue,
        copyRawText,
        copyMismatchReasons: e.reasons.join(";"),
        mismatchRatio:
          mismatchRatio != null ? Number(mismatchRatio.toFixed(4)) : null,
        contradictionType: contradictionType(mismatchRatio),
        hasProposal: e.m.hasProposal,
        galleryProposalCount: e.galleryHits.length,
        galleryProposalPaths: e.galleryHits.map(decodeUrl).join(" | "),
        mediaSubCategory: e.m.mediaSubCategory ?? "",
        reviewStatus: e.m.reviewStatus,
        alreadyAbc6: PHASE_B_ABC_FLAG_IDS.includes(e.m.id),
      };
    });

    rows.sort(
      (a, b) =>
        a.group - b.group || b.ratio - a.ratio || a.mediaName.localeCompare(b.mediaName, "ko"),
    );

    const header = [
      "mediaId",
      "mediaName",
      "group",
      "ratio",
      "impressions",
      "dailyFootfall",
      "computed_daily_x30",
      "copyClaimedValue",
      "copyRawText",
      "copyMismatchReasons",
      "mismatchRatio",
      "contradictionType",
      "hasProposal",
      "galleryProposalCount",
      "galleryProposalPaths",
      "mediaSubCategory",
      "verdict",
      "verdictNote",
    ];

    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.mediaId),
          csvEscape(r.mediaName),
          r.group,
          r.ratio,
          r.impressions,
          r.dailyFootfall,
          r.computedDailyX30,
          r.copyClaimedValue ?? "",
          csvEscape(r.copyRawText),
          csvEscape(r.copyMismatchReasons),
          r.mismatchRatio ?? "",
          r.contradictionType,
          r.hasProposal ? "true" : "false",
          r.galleryProposalCount,
          csvEscape(r.galleryProposalPaths),
          csvEscape(r.mediaSubCategory),
          "",
          "",
        ].join(","),
      ),
    ].join("\n") + "\n";

    mkdirSync(resolve(root, "reports"), { recursive: true });
    const csvPath = resolve(root, "reports/phase-b-contradiction-18.csv");
    writeFileSync(csvPath, csv, "utf8");

    const g1 = rows.filter((r) => r.group === 1);
    const g2 = rows.filter((r) => r.group === 2);
    const typeCount = (t: string) => rows.filter((r) => r.contradictionType === t).length;
    const fmt = (n: number) => n.toLocaleString("ko-KR");

    const md = `# Phase B 6단계 — 내부 모순 워크시트

- 출처: 5단계 \`phase-b-d-final-priority.csv\`와 동일 규칙 (카피월≠daily×30 / 카피일≠dailyFootfall / price=impressions / cpm≤10)
- 조회: 프로덕션 catalog DB read-only. **값·flagged·hasProposal 미변경**
- 조회일: 2026-08-21
- CSV: \`reports/phase-b-contradiction-18.csv\` (\`verdict\` / \`verdictNote\` 빈칸 — 사람 기록용)

## 실제 대상 건수

지시서 산술: 2그룹 14 + 1그룹 모순 4 = **18**. 그룹이 배타적이라 중복 없음.

| | 건수 |
|---|---|
| 실제 unique | **${rows.length}** |
| 그중 1그룹 | ${g1.length} |
| 그중 2그룹 | ${g2.length} |
| 이미 Phase B 6건 flagged | ${rows.filter((r) => r.alreadyAbc6).length} |

D-final 116 전체와 교차 확인: mismatch 신호가 있는 행만 이 표에 넣음.

## contradictionType (힌트, 판정 아님)

배수 = copyClaimedValue ÷ (dailyFootfall×30). 역수(1/배수)도 같은 허용오차 ±10%로 본다.
카피 숫자가 없으면 mismatchRatio 공란, 유형 OTHER.

| 유형 | 건수 | 기준 |
|---|---|---|
| UNIT_SUSPECT | ${typeCount("UNIT_SUSPECT")} | 30 / 365 / 12 부근 — 일·월·연 혼동 |
| MAGNITUDE_SUSPECT | ${typeCount("MAGNITUDE_SUSPECT")} | 10 / 100 / 1000 부근 — 자릿수 |
| OTHER | ${typeCount("OTHER")} | 위 아님 (price=impressions, CPM placeholder, 그 외 배수) |

## 1그룹 ${g1.length}건 (copyMismatchReasons 있음)

| 매체 | 비율 | 사유 | 카피값 | daily×30 | mismatchRatio | type | 갤러리제안서 | subCategory |
|---|---|---|---|---|---|---|---|---|
${g1
  .map(
    (r) =>
      `| ${r.mediaName} | ×${r.ratio} | ${r.copyMismatchReasons} | ${r.copyClaimedValue != null ? fmt(r.copyClaimedValue) : "—"} | ${fmt(r.computedDailyX30)} | ${r.mismatchRatio ?? "—"} | ${r.contradictionType} | ${r.galleryProposalCount} | ${r.mediaSubCategory || "—"} |`,
  )
  .join("\n")}

## 2그룹 ${g2.length}건

| 매체 | 비율 | 사유 | 카피값 | mismatchRatio | type | 갤러리제안서 | subCategory |
|---|---|---|---|---|---|---|---|
${g2
  .map(
    (r) =>
      `| ${r.mediaName} | ×${r.ratio} | ${r.copyMismatchReasons} | ${r.copyClaimedValue != null ? fmt(r.copyClaimedValue) : "—"} | ${r.mismatchRatio ?? "—"} | ${r.contradictionType} | ${r.galleryProposalCount} | ${r.mediaSubCategory || "—"} |`,
  )
  .join("\n")}

## 사람 판정 (이번 CSV에 아직 비움)

3단계 A/B/C 정의를 그대로 쓴다. \`verdict\` + \`verdictNote\`에 **어느 쪽이 틀렸는지**(카피 vs impressions vs dailyFootfall)를 한 줄로.

1. contradictionType 힌트
2. 갤러리 제안서 경로가 있으면 그 파일부터 (매체사 재요청 전)
3. 아니면 세일즈/계약 원본
4. flagged는 **별도 지시** 전까지 적용하지 않음

## 하지 않은 것

- impressions / dailyFootfall / 카피 / hasProposal / reviewStatus 변경 0건
- 1그룹 나머지(모순 신호 없는 16건) 미착수

## 별도 티켓 (이번 단계 범위 밖, 이슈만 생성)

- 4-1 hasProposal 미구현: https://github.com/THINKAD-web/tkad-web/issues/430
- 4-2 NFC/NFD 정규화: https://github.com/THINKAD-web/tkad-web/issues/431
- 4-3 광역전철 PKG 갤러리 혼재: https://github.com/THINKAD-web/tkad-web/issues/432
`;

    const mdPath = resolve(root, "reports/phase-b-contradiction-18-summary.md");
    writeFileSync(mdPath, md, "utf8");

    console.log(
      JSON.stringify(
        {
          unique: rows.length,
          group1: g1.length,
          group2: g2.length,
          UNIT_SUSPECT: typeCount("UNIT_SUSPECT"),
          MAGNITUDE_SUSPECT: typeCount("MAGNITUDE_SUSPECT"),
          OTHER: typeCount("OTHER"),
          flaggedUnchanged: rows.filter((r) => r.reviewStatus === "flagged").length,
          csvPath,
          mdPath,
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
