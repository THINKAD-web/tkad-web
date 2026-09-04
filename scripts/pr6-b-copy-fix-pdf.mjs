#!/usr/bin/env node
/**
 * PR6-b copy-fix — regenerate onlyOnline + mixed PDF/PPTX for manual review.
 *
 * Usage:
 *   BASE=http://127.0.0.1:3000 node --import tsx scripts/pr6-b-copy-fix-pdf.mjs
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlanCartReportBundle } from "../lib/plan-cart-report/build-report.ts";
import { buildReportPayload } from "../lib/planner-report-export/build-report-payload.ts";
import { buildPlannerReportPdf } from "../lib/planner-report-export/build-pdf.ts";
import { buildPlannerReportPptx } from "../lib/planner-report-export/build-pptx.ts";
import { planCartItemFromMediaItem } from "../lib/plan-cart-item-builders.ts";
import { reportExportCoverSubtitle } from "../lib/planner-report-export/report-cover-copy.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "reports/pr6-b-copy-fix");
const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const OOH_NAME = "광화문 루미";
const ONLINE_CALC_SLUG = "tiktok-spark-awareness";
const ONLINE_INQ_SLUG = "karrot-local-traffic";

/** Must not appear in onlyOnline cover/greeting/executive/online block */
const OOH_FORBIDDEN_ONLY_ONLINE = [
  "OOH 미디어 캠페인 플랜",
  "OOH 미디어 플랜",
  "OOH 미디어",
  "동선",
  "노출 효율",
  "유동",
  "리타게팅",
  "핵심 동선",
];

async function fetchCatalog() {
  const res = await fetch(`${BASE}/api/public/media-catalog`, { cache: "no-store" });
  assert.ok(res.ok, `catalog fetch ${res.status} from ${BASE}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function findBySlug(catalog, slug) {
  return catalog.find((m) => m.slug === slug);
}

function findOohLumi(catalog) {
  return catalog.find(
    (m) =>
      m.name?.includes(OOH_NAME) &&
      !m.catalogChannel?.includes("online") &&
      m.type !== "online",
  );
}

function buildPayloadFromCart(cart, catalog) {
  const bundle = buildPlanCartReportBundle({ cart, catalog, isKo: true });
  assert.ok(bundle, "null bundle");
  const { reportProps: rp } = bundle;
  return buildReportPayload({
    isKo: true,
    goalTitle: rp.goalTitle,
    budgetMan: rp.budgetNum,
    periodDisplay: "2026-09-01 ~ 2026-09-30",
    regionsText: rp.regionsText,
    categoriesText: rp.categoriesText,
    ageText: rp.ageText,
    industryText: rp.industryText,
    industryKey: rp.industryKey,
    campaignGoal: rp.campaignGoal,
    portfolio: rp.portfolio,
    metrics: rp.metrics,
    blendedCpmKrw: null,
    budgetAllocation: [],
    cpmBars: [],
    effectSummaryLines: [],
    generatedAt: "2026-09-05",
    months: rp.months,
    planCartItems: cart.items,
    reportGreeting:
      "안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 제안을 드립니다.",
    reportExecutiveSummaryLines: [
      "왜 이 구성인가 · 핵심 동선 기반 노출 효율",
      "다음 액션 · 디지털 리타게팅",
    ],
  });
}

function extractPdfText(pdfPath) {
  try {
    return execSync(`pdftotext "${pdfPath}" -`, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  } catch {
    return "";
  }
}

function extractPptxText(pptxPath) {
  const tmp = join(OUT, ".pptx-unpack");
  execSync(`rm -rf "${tmp}" && mkdir -p "${tmp}" && unzip -q "${pptxPath}" -d "${tmp}"`);
  try {
    return execSync(`rg -o "[^<]+" "${tmp}/ppt/slides" --no-filename || true`, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

function assertNoOohLeak(text, label) {
  const hits = OOH_FORBIDDEN_ONLY_ONLINE.filter((term) => text.includes(term));
  assert.equal(hits.length, 0, `${label}: OOH leak terms found: ${hits.join(", ")}`);
}

function assertOnlyOnlinePayload(payload) {
  assert.equal(payload.reportComposition, "onlyOnline");
  assert.match(payload.documentTitle, /온라인/);
  assert.ok(payload.greetingText?.includes("온라인"));
  assert.ok(!payload.greetingText?.includes("OOH"));
  assert.ok(payload.executiveSummaryLines?.some((l) => l.startsWith("왜 이 구성인가")));
  for (const line of payload.executiveSummaryLines ?? []) {
    for (const bad of OOH_FORBIDDEN_ONLY_ONLINE) {
      assert.ok(!line.includes(bad), `executive leak: ${bad}`);
    }
  }
  assert.equal(payload.sections?.length ?? 0, 0);
  const subtitle = reportExportCoverSubtitle(true, {
    kind: payload.kind,
    reportComposition: payload.reportComposition,
  });
  assert.match(subtitle, /온라인/);
  assert.ok(!subtitle.includes("OOH"));
}

function assertMixedPayload(payload) {
  assert.equal(payload.reportComposition, "mixed");
  assert.equal(payload.documentTitle, "통합 매체 제안 보고서");
  assert.ok(payload.onlineSection?.lines.length >= 1);

  const whyCount = [
    ...(payload.executiveSummaryLines ?? []),
    ...(payload.sections ?? []).flatMap((s) => s.lines),
  ].filter((l) => l.startsWith("왜 이 구성인가")).length;
  assert.equal(whyCount, 1, "mixed must have single why-line");

  const onlineBlock = [
    payload.onlineSection?.estimationNotice,
    payload.onlineSection?.consultationNotice,
    ...(payload.onlineSection?.lines ?? []).map((l) => l.name),
  ].join("\n");
  for (const bad of ["동선", "노출 효율", "유동"]) {
    assert.ok(!onlineBlock.includes(bad), `online table leak: ${bad}`);
  }

  assert.equal(
    payload.sections?.find((s) => s.title === "온라인 채널"),
    undefined,
    "online strategy must not duplicate in sections[]",
  );
}

async function writeArtifacts(name, payload) {
  const pdfBytes = await buildPlannerReportPdf(payload, {});
  const pptxBytes = await buildPlannerReportPptx(payload, {});
  const pdfPath = join(OUT, `${name}.pdf`);
  const pptxPath = join(OUT, `${name}.pptx`);
  writeFileSync(pdfPath, Buffer.from(pdfBytes));
  writeFileSync(pptxPath, Buffer.from(pptxBytes));

  const pdfText = extractPdfText(pdfPath);
  const pptxText = extractPptxText(pptxPath);
  writeFileSync(join(OUT, `${name}-pdf-text.txt`), pdfText || "(pdftotext unavailable)");
  writeFileSync(join(OUT, `${name}-pptx-text.txt`), pptxText);

  writeFileSync(
    join(OUT, `${name}-payload.json`),
    JSON.stringify(
      {
        reportComposition: payload.reportComposition,
        documentTitle: payload.documentTitle,
        coverSubtitle: reportExportCoverSubtitle(true, {
          kind: payload.kind,
          reportComposition: payload.reportComposition,
        }),
        greetingText: payload.greetingText,
        executiveSummaryLines: payload.executiveSummaryLines,
        consultationNotice: payload.onlineSection?.consultationNotice,
        onlineLineNames: payload.onlineSection?.lines.map((l) => l.name),
        pdfBytes: pdfBytes.byteLength,
        pptxBytes: pptxBytes.byteLength,
      },
      null,
      2,
    ),
  );

  return { pdfPath, pptxPath, pdfText, pptxText, pdfBytes, pptxBytes };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`BASE=${BASE} OUT=${OUT}\n`);

  const catalog = await fetchCatalog();
  assert.ok(catalog.length > 20, "catalog too small");

  const ooh = findOohLumi(catalog);
  const tiktok = findBySlug(catalog, ONLINE_CALC_SLUG);
  const karrot = findBySlug(catalog, ONLINE_INQ_SLUG);
  assert.ok(ooh && tiktok && karrot, "fixtures missing");

  // ── onlyOnline ──
  console.log("=== onlyOnline ===");
  const onlyCart = {
    items: [tiktok, karrot].map((m, i) => ({
      ...planCartItemFromMediaItem(m, "search"),
      addedAt: Date.now() + i,
    })),
    campaignGoal: "awareness",
    totalBudget: 3000,
    duration: 1,
    updatedAt: new Date().toISOString(),
  };
  const onlyPayload = buildPayloadFromCart(onlyCart, catalog);
  assertOnlyOnlinePayload(onlyPayload);
  const only = await writeArtifacts("only-online-report", onlyPayload);
  if (only.pdfText) assertNoOohLeak(only.pdfText, "onlyOnline PDF");
  assertNoOohLeak(only.pptxText, "onlyOnline PPTX");
  console.log(`[PASS] onlyOnline PDF  ${only.pdfPath} (${only.pdfBytes.byteLength} B)`);
  console.log(`[PASS] onlyOnline PPTX ${only.pptxPath} (${only.pptxBytes.byteLength} B)`);

  // ── mixed ──
  console.log("\n=== mixed ===");
  const mixedCart = {
    items: [ooh, tiktok, karrot].map((m, i) => ({
      ...planCartItemFromMediaItem(m, "search"),
      addedAt: Date.now() + i,
    })),
    campaignGoal: "awareness",
    totalBudget: 5000,
    duration: 1,
    updatedAt: new Date().toISOString(),
  };
  const mixedPayload = buildPayloadFromCart(mixedCart, catalog);
  assertMixedPayload(mixedPayload);
  const mixed = await writeArtifacts("mixed-cart-report", mixedPayload);
  // mixed may legitimately contain OOH terms in OOH sections
  assert.ok(mixed.pptxText.includes("통합 매체 제안 보고서"), "mixed title in pptx");
  assert.ok(mixed.pptxText.includes("온라인 채널"), "mixed online section");
  assert.ok(mixed.pptxText.includes("1개 상품은 별도 협의 필요"), "mixed inquiry");
  console.log(`[PASS] mixed PDF  ${mixed.pdfPath} (${mixed.pdfBytes.byteLength} B)`);
  console.log(`[PASS] mixed PPTX ${mixed.pptxPath} (${mixed.pptxBytes.byteLength} B)`);

  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify(
      {
        status: "PASS",
        at: new Date().toISOString(),
        base: BASE,
        artifacts: {
          onlyOnline: { pdf: only.pdfPath, pptx: only.pptxPath },
          mixed: { pdf: mixed.pdfPath, pptx: mixed.pptxPath },
        },
        onlyOnlinePdfTextSample: only.pdfText?.slice(0, 1200) ?? null,
      },
      null,
      2,
    ),
  );

  console.log(`\n✅ Artifacts ready: ${OUT}`);
}

main().catch((e) => {
  console.error("[FAIL]", e?.message ?? e);
  process.exit(1);
});
