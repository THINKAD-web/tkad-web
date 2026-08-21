#!/usr/bin/env npx tsx
/**
 * Phase B 5단계 준비 — D-final 116건 우선순위표. 읽기 전용, flagged/값 미변경.
 *
 *   npx tsx scripts/audit-phase-b-d-final-priority.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

const D_CSV = resolve(root, "reports/phase-b-audit-report-d-final.csv");
const TOP_N = 20;
const REL_TOL = 0.1;

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

function loadD116Ids(): string[] {
  const raw = readFileSync(D_CSV, "utf8");
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || line.startsWith("mediaId")) continue;
    const id = line.split(",")[0]?.trim();
    if (id && /^cm[a-z0-9]{20,}$/i.test(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
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
  const den = Math.max(a, b);
  return Math.abs(a - b) / den <= REL_TOL;
}

function parseKoMagnitude(digits: string, unit: string | undefined): number | null {
  const n = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === "억") return n * 100_000_000;
  if (unit === "만") return n * 10_000;
  return n;
}

function flattenCopy(...parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, n = 420): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 카피에서 유동/노출 규모만. 가격(만원·원)은 제외. */
function extractAudienceNumbers(text: string): {
  monthly: number[];
  daily: number[];
  snippets: string[];
} {
  const monthly: number[] = [];
  const daily: number[] = [];
  const snippets: string[] = [];
  if (!text) return { monthly, daily, snippets };

  const push = (arr: number[], v: number | null, snip: string) => {
    if (v == null || v < 100) return;
    arr.push(v);
    snippets.push(`${snip}→${v.toLocaleString("ko-KR")}`);
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

  return { monthly, daily, snippets };
}

function statusVs(
  extracted: number[],
  target: number,
): "일치" | "불일치" | "카피숫자없음" {
  if (extracted.length === 0) return "카피숫자없음";
  return extracted.some((n) => close(n, target)) ? "일치" : "불일치";
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");
  const dIds = loadD116Ids();
  if (dIds.length !== 116) {
    console.warn(`D-final id count=${dIds.length} (expected 116)`);
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await db.$executeRawUnsafe("SET default_transaction_read_only = on");
    const medias = await db.media.findMany({
      where: { id: { in: dIds } },
      select: {
        id: true,
        name: true,
        location: true,
        description: true,
        effectMemo: true,
        priceNote: true,
        impressions: true,
        dailyFootfall: true,
        price: true,
        cpm: true,
        hasProposal: true,
        proposalUrl: true,
        proposalFileName: true,
        image: true,
        extractedImages: true,
        reviewStatus: true,
        reviewReason: true,
        isActive: true,
        mediaSubCategory: true,
        mediaMainCategory: true,
        type: true,
      },
    });

    const byId = new Map(medias.map((m) => [m.id, m]));
    type Built = {
      ratioRank: number;
      group: 1 | 2 | 3;
      mediaId: string;
      mediaName: string;
      impressions: number;
      dailyFootfall: number;
      ratio: number;
      dailyX30: number;
      copyMonthlyVsDailyX30: string;
      copyDailyVsFootfall: string;
      copyMonthlyVsImpressions: string;
      copySnippets: string;
      description: string;
      effectMemo: string;
      priceNote: string;
      location: string;
      price: number | null;
      cpm: number | null;
      recalcCpm: number | null;
      priceEqImpressions: boolean;
      placeholderCpm: boolean;
      copyMismatch: boolean;
      group2Reasons: string;
      hasProposal: boolean;
      proposalFileExists: boolean;
      proposalFileCount: number;
      reviewStatus: string;
      reviewReason: string;
      alreadyAbc6: boolean;
      isActive: boolean;
      mediaSubCategory: string;
    };

    const built: Built[] = [];
    for (const id of dIds) {
      const m = byId.get(id);
      if (!m || m.impressions == null || m.dailyFootfall == null) continue;
      const impressions = m.impressions;
      const dailyFootfall = m.dailyFootfall;
      const dailyX30 = dailyFootfall * 30;
      const ratio = impressions / dailyFootfall;
      const copy = flattenCopy(m.description, m.effectMemo, m.priceNote);
      const extracted = extractAudienceNumbers(copy);
      const copyMonthlyVsDailyX30 = statusVs(extracted.monthly, dailyX30);
      const copyDailyVsFootfall = statusVs(extracted.daily, dailyFootfall);
      const copyMonthlyVsImpressions = statusVs(extracted.monthly, impressions);
      const gallery = uniqueNonEmpty([m.image, ...(m.extractedImages ?? [])]);
      const galleryHits = gallery.filter(isProposalAssetUrl);
      const canonical =
        Boolean(m.proposalUrl?.trim()) || Boolean(m.proposalFileName?.trim());
      const proposalHits = uniqueNonEmpty([m.proposalUrl, ...galleryHits]);
      const priceEqImpressions =
        m.price != null && m.price >= 100_000 && m.price === impressions;
      const placeholderCpm =
        m.cpm != null && m.cpm <= 10 && impressions > 0 && (m.price ?? 0) > 0;
      const reasons: string[] = [];
      if (copyMonthlyVsDailyX30 === "불일치") {
        reasons.push("카피월≠daily×30");
      }
      if (copyDailyVsFootfall === "불일치") {
        reasons.push("카피일≠dailyFootfall");
      }
      if (priceEqImpressions) reasons.push("price=impressions");
      if (placeholderCpm) reasons.push("cpm≤10(placeholder)");
      const recalcCpm =
        impressions > 0 && m.price != null
          ? Math.round((m.price / impressions) * 1000)
          : null;

      built.push({
        ratioRank: 0,
        group: 3,
        mediaId: m.id,
        mediaName: m.name,
        impressions,
        dailyFootfall,
        ratio: Number(ratio.toFixed(2)),
        dailyX30,
        copyMonthlyVsDailyX30,
        copyDailyVsFootfall,
        copyMonthlyVsImpressions,
        copySnippets: extracted.snippets.join(" | "),
        description: clip(m.description ?? ""),
        effectMemo: clip(m.effectMemo ?? ""),
        priceNote: clip(m.priceNote ?? "", 200),
        location: clip(m.location ?? "", 120),
        price: m.price,
        cpm: m.cpm,
        recalcCpm,
        priceEqImpressions,
        placeholderCpm,
        copyMismatch: reasons.length > 0,
        group2Reasons: reasons.join(";"),
        hasProposal: m.hasProposal,
        proposalFileExists: canonical || galleryHits.length > 0,
        proposalFileCount: proposalHits.length,
        reviewStatus: m.reviewStatus,
        reviewReason: m.reviewReason ?? "",
        alreadyAbc6: PHASE_B_ABC_FLAG_IDS.includes(m.id),
        isActive: m.isActive,
        mediaSubCategory: m.mediaSubCategory ?? "",
      });
    }

    built.sort((a, b) => b.ratio - a.ratio);
    built.forEach((r, i) => {
      r.ratioRank = i + 1;
    });

    const top20 = new Set(built.slice(0, TOP_N).map((r) => r.mediaId));
    for (const r of built) {
      if (top20.has(r.mediaId)) r.group = 1;
      else if (r.copyMismatch) r.group = 2;
      else r.group = 3;
    }

    built.sort(
      (a, b) => a.group - b.group || b.ratio - a.ratio || a.mediaName.localeCompare(b.mediaName, "ko"),
    );

    const header = [
      "group",
      "ratioRank",
      "mediaId",
      "mediaName",
      "impressions",
      "dailyFootfall",
      "ratio",
      "dailyFootfallx30",
      "copyMonthlyVsDailyX30",
      "copyDailyVsFootfall",
      "copyMonthlyVsImpressions",
      "copySnippets",
      "copyMismatchReasons",
      "description",
      "effectMemo",
      "priceNote",
      "location",
      "price",
      "cpm",
      "recalcCpm",
      "priceEqualsImpressions",
      "hasProposal",
      "proposalFileExists",
      "proposalFileCount",
      "reviewStatus",
      "reviewReason",
      "alreadyPhaseB6",
      "isActive",
      "mediaSubCategory",
    ];

    const lines = [
      header.join(","),
      ...built.map((r) =>
        [
          r.group,
          r.ratioRank,
          csvEscape(r.mediaId),
          csvEscape(r.mediaName),
          r.impressions,
          r.dailyFootfall,
          r.ratio,
          r.dailyX30,
          r.copyMonthlyVsDailyX30,
          r.copyDailyVsFootfall,
          r.copyMonthlyVsImpressions,
          csvEscape(r.copySnippets),
          csvEscape(r.group2Reasons),
          csvEscape(r.description),
          csvEscape(r.effectMemo),
          csvEscape(r.priceNote),
          csvEscape(r.location),
          r.price ?? "",
          r.cpm ?? "",
          r.recalcCpm ?? "",
          r.priceEqImpressions ? "Y" : "N",
          r.hasProposal ? "true" : "false",
          r.proposalFileExists ? "있음" : "없음",
          r.proposalFileCount,
          r.reviewStatus,
          csvEscape(r.reviewReason),
          r.alreadyAbc6 ? "Y" : "N",
          r.isActive ? "true" : "false",
          csvEscape(r.mediaSubCategory),
        ].join(","),
      ),
    ];

    mkdirSync(resolve(root, "reports"), { recursive: true });
    const csvPath = resolve(root, "reports/phase-b-d-final-priority.csv");
    writeFileSync(csvPath, lines.join("\n") + "\n", "utf8");

    const g1 = built.filter((r) => r.group === 1);
    const g2 = built.filter((r) => r.group === 2);
    const g3 = built.filter((r) => r.group === 3);
    const mismatchInG1 = g1.filter((r) => r.copyMismatch).length;
    const flaggedNow = built.filter((r) => r.reviewStatus === "flagged");
    const abcInD = built.filter((r) => r.alreadyAbc6);
    const proposalMismatch = built.filter(
      (r) => !r.hasProposal && r.proposalFileExists,
    );

    const fmt = (n: number) => n.toLocaleString("ko-KR");
    const rowMd = (r: Built) =>
      `| ${r.ratioRank} | ${r.mediaName} | \`${r.mediaId}\` | ${fmt(r.impressions)} / ${fmt(r.dailyFootfall)} | ×${r.ratio} | ${fmt(r.dailyX30)} | ${r.copyMonthlyVsDailyX30} | ${r.copyMismatch ? r.group2Reasons : "—"} | ${r.hasProposal} / ${r.proposalFileExists ? "있음" : "없음"}(${r.proposalFileCount}) | ${r.reviewStatus} |`;

    const md = `# Phase B 5단계 — D-final 116건 우선순위표 (준비)

- 기준: \`reports/phase-b-audit-report-d-final.csv\` (impressions > dailyFootfall × 50)
- 조회: 프로덕션 catalog DB read-only (\`SET default_transaction_read_only = on\`)
- 조회일: 2026-08-21
- **이번 단계에서 flagged / impressions / dailyFootfall 변경 없음**
- 상세 CSV: \`reports/phase-b-d-final-priority.csv\`

그룹은 배타적이다. 1그룹(비율 상위 20)에 들어가면 카피 불일치가 있어도 2그룹으로 내리지 않는다.

| 그룹 | 건수 | 정의 |
|---|---|---|
| 1 | ${g1.length} | 비율 상위 20건 (즉시 검증) |
| 2 | ${g2.length} | 1그룹 제외 + 카피/내부 수치 모순 |
| 3 | ${g3.length} | 나머지 |
| 합계 | ${built.length} | |

1그룹 안에도 카피/내부 모순 신호가 있는 건 **${mismatchInG1}건** (그룹은 1 유지, CSV \`copyMismatchReasons\` 참고).

### 자동 계산 정의

- \`dailyFootfallx30\` = 저장된 일유동 × 30 (카피의 “월 ○명”과 대조)
- 카피 숫자는 description / effectMemo / priceNote에서 **월 …명** · **하루/일평균 …명**만 추출. 가격(만원·원), 구좌, 송출 횟수(회)는 제외.
- 상대 오차 10% 이내면 일치.
- D 리스트 정의상 **impressions는 항상 daily×50을 초과**하므로, impressions ≠ daily×30인 것은 전건 해당. 그룹 2 조건으로 쓰지 않음.
- 추가 내부 모순: \`price === impressions\`(가격=노출 카운트), \`cpm ≤ 10\`(placeholder 의심).

### hasProposal (점검 결과 재사용)

| | 건수 |
|---|---|
| hasProposal=true | ${built.filter((r) => r.hasProposal).length} |
| hasProposal=false, 갤러리/URL에 제안서형 파일 있음 | ${proposalMismatch.length} |
| hasProposal=false, 제안서형 파일 없음 | ${built.filter((r) => !r.hasProposal && !r.proposalFileExists).length} |

3단계와 같이 \`hasProposal=false\`만 보고 “제안서 없다”고 단정하지 말 것. 갤러리 JPEG(파일명에 제안서)를 먼저 볼 것.

### flagged 상태 (미변경 확인)

| reviewStatus | 건수 |
|---|---|
| flagged | ${flaggedNow.length} |
| clean | ${built.filter((r) => r.reviewStatus === "clean").length} |
| reviewed | ${built.filter((r) => r.reviewStatus === "reviewed").length} |

이번 스크립트는 SELECT만 수행. **116건의 reviewStatus를 쓰지 않음.**

이미 Phase B 6건(A/B/C)에 들어 있는 D-final 교집합 **${abcInD.length}건** — 5단계 신규 검증보다 3단계 트랙이 우선.

${abcInD.map((r) => `- ${r.mediaName} (\`${r.mediaId}\`) reviewStatus=${r.reviewStatus} reason=${r.reviewReason || "—"}`).join("\n")}

---

## 1그룹 — 비율 상위 20 (즉시 검증)

3단계와 동일: 세일즈/원본 대조 → A/B/C. 이 표는 판정이 아님.

| 순위 | 매체 | ID | 월노출 / 일유동 | 비율 | daily×30 | 카피월 vs ×30 | 모순 신호 | hasProposal / 파일 | reviewStatus |
|---|---|---|---|---|---|---|---|---|---|
${g1.map(rowMd).join("\n")}

골프장 미디어바(\`cmp3v92yy000004jr7i6ykgy1\`, 순위 3)는 D ×50 리스트에 남아 있으나, 이전 감사에서 **분류 오류(subway_psd)** 가능성이 기록됨. 값 이상치와 분류 이슈를 구분해 볼 것.

---

## 2그룹 — 카피/내부 모순 (${g2.length}건, 1그룹 제외)

원본 대조 전에도 카피·저장값이 안 맞는 신호. 1그룹 처리 경험을 보고 자동화 후보로 넘길 예정.

${g2.map((r) => `- ×${r.ratio} ${r.mediaName} (\`${r.mediaId}\`) — ${r.group2Reasons || "—"} ; 카피추출: ${r.copySnippets || "(없음)"}`).join("\n")}

---

## 3그룹 — 나머지 ${g3.length}건

비율 ×50 초과이지만 카피에서 월/일 숫자를 못 뽑았거나, 뽑은 숫자가 daily×30(또는 일유동)과 10% 안이다. **정상 확정이 아님.** 1·2그룹 이후에 순차 검증.

CSV에서 \`group=3\` 필터.

---

## 하지 않은 것

- flagged 적용 / reviewed 전환
- impressions · dailyFootfall 수정
- classifyForMetricsWrite 수정
- 제안서 파일 내용 열람
`;

    const mdPath = resolve(root, "reports/phase-b-d-final-priority-summary.md");
    writeFileSync(mdPath, md, "utf8");

    console.log(
      JSON.stringify(
        {
          dCsvIds: dIds.length,
          rows: built.length,
          group1: g1.length,
          group2: g2.length,
          group3: g3.length,
          mismatchInG1,
          flaggedNow: flaggedNow.length,
          abcInD: abcInD.length,
          proposalMismatch: proposalMismatch.length,
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
