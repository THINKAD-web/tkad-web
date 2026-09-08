/**
 * Inquiry shadow diff 배치 실행 + JSON/MD 리포트.
 *
 * Usage:
 *   npx tsx scripts/run-inquiry-shadow-diff.mts
 *   npx tsx scripts/run-inquiry-shadow-diff.mts --out=reports/inquiry-shadow-diff.json
 */
import { createRequire } from "node:module";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
(globalThis as { require?: NodeRequire }).require = createRequire(import.meta.url);

// shadow 로그가 run-dry-run 내부에서 중복 실행되지 않도록
process.env.INQUIRY_SHADOW_RECOMMEND = "0";

import { loadProposalCatalog } from "../lib/inquiry-auto-proposal/load-catalog.ts";
import { runInquiryAutoProposalDryRun } from "../lib/inquiry-auto-proposal/run-dry-run.ts";
import { INQUIRY_SHADOW_SAMPLE_CASES } from "../lib/inquiry-auto-proposal/shadow-samples.ts";
import {
  buildInquiryShadowDiffReport,
  summarizeInquiryShadowReports,
  type InquiryShadowDiffCategory,
  type InquiryShadowDiffReport,
} from "../lib/inquiry-auto-proposal/shadow-recommend.ts";

function parseArgs() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  return {
    out: outArg
      ? outArg.slice("--out=".length)
      : "reports/inquiry-shadow-diff.json",
  };
}

const CATEGORY_KO: Record<InquiryShadowDiffCategory, string> = {
  nearly_identical: "거의 동일 (mix ≥90% 일치)",
  both_reasonable: "다르지만 둘 다 합리적",
  shadow_better: "신규 엔진이 명백히 더 나음",
  shadow_problematic: "신규 엔진 이상 — 전환 주의",
};

function renderMarkdown(
  reports: InquiryShadowDiffReport[],
  summary: ReturnType<typeof summarizeInquiryShadowReports>,
): string {
  const lines: string[] = [
    "# Inquiry Shadow-mode Diff 리포트",
    "",
    `생성: ${new Date().toISOString()}`,
    "",
    "## 요약",
    "",
    `- 비교 건수: **${summary.total}**`,
    `- nearly_identical: ${summary.byCategory.nearly_identical}`,
    `- both_reasonable: ${summary.byCategory.both_reasonable}`,
    `- shadow_better: ${summary.byCategory.shadow_better}`,
    `- shadow_problematic: ${summary.byCategory.shadow_problematic}`,
    "",
    `**Primary 전환 가능:** ${summary.canPromoteToPrimary ? "예" : "아니오 — 보완 필요"}`,
    "",
  ];

  if (summary.promotionBlockers.length > 0) {
    lines.push("### 전환 blocker");
    for (const b of summary.promotionBlockers) {
      lines.push(`- ${b}`);
    }
    lines.push("");
  }

  lines.push("## 케이스별");
  lines.push("");

  for (const r of reports) {
    lines.push(`### ${r.sampleId ?? "case"} — ${r.label ?? ""}`);
    lines.push("");
    lines.push(`- 분류: **${CATEGORY_KO[r.category]}**`);
    lines.push(`- mix Jaccard: ${(r.mixJaccard * 100).toFixed(0)}%`);
    lines.push(`- legacy mix (${r.legacyMixIds.length}): ${r.legacyMixIds.join(", ") || "—"}`);
    lines.push(`- shadow mix (${r.shadowMixIds.length}): ${r.shadowMixIds.join(", ") || "—"}`);
    lines.push(
      `- 예산 사용: legacy ₩${r.legacyMixTotalWon.toLocaleString("ko-KR")} / shadow ₩${r.shadowMixTotalWon.toLocaleString("ko-KR")}`,
    );
    lines.push(
      `- named lock-in 생존: ${(r.namedLockInSurvivalRate * 100).toFixed(0)}%`,
    );
    if (r.notes.length) {
      lines.push(`- 메모: ${r.notes.join(" · ")}`);
    }
    if (r.shadow.recommendTop.length > 0) {
      const top = r.shadow.recommendTop
        .slice(0, 5)
        .map((t) => `${t.name.slice(0, 24)}(${t.score})`)
        .join(", ");
      lines.push(`- recommend top5: ${top}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const { out } = parseArgs();
  const catalog = await loadProposalCatalog();
  if (catalog.length === 0) {
    console.error("proposal catalog empty — DATABASE_URL 확인");
    process.exit(1);
  }

  const reports: InquiryShadowDiffReport[] = [];

  for (const sample of INQUIRY_SHADOW_SAMPLE_CASES) {
    const legacyDry = await runInquiryAutoProposalDryRun(sample.text, {
      proposalCatalog: catalog,
      flightStart: "2026-09-01",
    });
    const report = await buildInquiryShadowDiffReport({
      text: sample.text,
      legacyDry,
      proposalCatalog: catalog,
      sampleId: sample.id,
      label: sample.label,
    });
    reports.push(report);
    console.log(
      `[${sample.id}] ${report.category} jaccard=${(report.mixJaccard * 100).toFixed(0)}% legacy=${report.legacyMixIds.length} shadow=${report.shadowMixIds.length}`,
    );
  }

  const summary = summarizeInquiryShadowReports(reports);
  const payload = {
    generatedAt: new Date().toISOString(),
    sampleCount: reports.length,
    summary,
    reports: reports.map(({ shadow, ...rest }) => ({
      ...rest,
      shadow: {
        ok: shadow.ok,
        error: shadow.error,
        recommendCount: shadow.recommendCount,
        recommendTop: shadow.recommendTop.slice(0, 15),
        namedLockIns: shadow.namedLockIns,
        shadowDesignatedCount: shadow.shadowDesignatedIds.length,
      },
    })),
  };

  const outPath = resolve(root, out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const mdPath = outPath.replace(/\.json$/i, ".md");
  writeFileSync(mdPath, renderMarkdown(reports, summary));

  console.log("\n", JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Wrote ${mdPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
