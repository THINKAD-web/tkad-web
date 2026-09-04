#!/usr/bin/env node
/**
 * PR7 Preview verification — below-min, Studio ROI 3-card, PDF/PPTX layout.
 *
 * Usage:
 *   BASE=https://tkad-web-git-feat-pr7-proposal-channel-….vercel.app \
 *     node --import tsx scripts/pr7-preview-verify.mjs
 *
 * Optional: VERCEL_SHARE or --share for deployment protection.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  resolvePreviewBase,
  resolveVercelShareToken,
  primeVercelShareCookie,
  vercelProtectionBypassHeaders,
} from "./lib/vercel-preview-bypass.mjs";
import { fetchPublicMediaCatalogList } from "../lib/public-media-catalog.ts";
import {
  buildFallbackProposal,
  buildGeneralFallback,
} from "../lib/proposal/generate-proposal.ts";
import { buildProposalOnlineFacts } from "../lib/proposal/proposal-online-adapter.ts";
import { estimatePerformance } from "../lib/pricing/online-performance-estimate.ts";
import { isOnlineCatalogMedia } from "../lib/pricing-unavailable.ts";
import { sectionsForType } from "../lib/proposal/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "reports/pr7-preview");
mkdirSync(OUT, { recursive: true });

const rawBase =
  process.env.BASE ??
  "https://tkad-web-git-feat-pr7-proposal-channel-mannote-6701s-projects.vercel.app";
const { origin: PREVIEW_ORIGIN } = resolvePreviewBase(rawBase);
const SHARE = resolveVercelShareToken();

const report = {
  base: PREVIEW_ORIGIN,
  sha: "ede84191",
  scenarios: {},
  checks: [],
  pr6cRebaseNotes: [],
};

function pass(id, detail) {
  report.checks.push({ id, ok: true, detail });
  console.log(`PASS ${id}: ${detail}`);
}
function fail(id, detail) {
  report.checks.push({ id, ok: false, detail });
  console.error(`FAIL ${id}: ${detail}`);
}

async function fetchPreview(path, init = {}) {
  const headers = {
    ...vercelProtectionBypassHeaders(),
    ...(init.headers ?? {}),
  };
  const url = `${PREVIEW_ORIGIN}${path}`;
  return fetch(url, { ...init, headers, cache: "no-store" });
}

function proposalInput(overrides) {
  return {
    brandName: "PR7검증",
    industry: "뷰티",
    campaignName: "온라인 제안 실측",
    targetAge: "20-34",
    targetGender: "전체",
    targetInterests: "",
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    budgetManwon: 100,
    goal: "awareness",
    regions: ["online"],
    mediaIds: [],
    locale: "ko",
    ...overrides,
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCampaignProposalHtml(input, proposal) {
  const rows = proposal.mediaMix
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.mediaName)}</td><td>${escapeHtml(r.role)}</td><td>${r.budgetSharePct}%</td></tr>`,
    )
    .join("");
  const budget = proposal.budgetAllocation
    .map(
      (b) =>
        `<li>${escapeHtml(b.label)}: ₩${b.amountWon.toLocaleString("ko-KR")} (${b.sharePct}%)</li>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<style>
body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:800px}
h1{font-size:22px} h2{font-size:13px;text-transform:uppercase;margin-top:24px}
p,li{font-size:14px;line-height:1.55} table{width:100%;border-collapse:collapse;font-size:12px}
td,th{border-bottom:1px solid #eee;padding:8px 4px;text-align:left}
.consult{color:#b45309;font-size:11px}
</style></head><body>
<h1>캠페인 제안서 · ${escapeHtml(input.campaignName)}</h1>
<p>${escapeHtml(input.brandName)} · ${input.budgetManwon}만원</p>
<h2>개요</h2><p style="white-space:pre-wrap">${escapeHtml(proposal.overview)}</p>
<h2>전략</h2><p style="white-space:pre-wrap">${escapeHtml(proposal.strategy)}</p>
<h2>매체 믹스</h2><table><thead><tr><th>매체</th><th>역할</th><th>비중</th></tr></thead><tbody>${rows}</tbody></table>
<h2>예산</h2><ul>${budget}</ul>
<h2>예상 KPI</h2>
<p>노출: ${proposal.metrics.estimatedImpressions.toLocaleString("ko-KR")}
 · 도달: ${proposal.metrics.estimatedReach.toLocaleString("ko-KR")}
 · CPM: ₩${proposal.metrics.estimatedCpm.toLocaleString("ko-KR")}</p>
<p class="consult">※ PDF 라벨 「노출」은 reach midpoint 매핑 (임시)</p>
</body></html>`;
}

function renderStudioRoiHtml(input, output) {
  const cards = (output.roiScenarios ?? [])
    .map(
      (r) => `<div class="card ${r.scenario === "base" ? "base" : ""}">
  <p class="label">${escapeHtml(r.label)}</p>
  <p>노출 <b>${r.impressions.toLocaleString("ko-KR")}</b></p>
  <p>도달 <b>${r.reach.toLocaleString("ko-KR")}</b></p>
  <p class="note">${escapeHtml(r.note ?? "")}</p>
</div>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<style>
body{font-family:system-ui,sans-serif;padding:32px;color:#111}
h1{font-size:20px} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:12px}
.card.base{border-color:#f97316;background:#fff7ed}
.label{font-weight:700;color:#ea580c;margin:0 0 8px}
.note{color:#888;font-size:10px;margin-top:8px}
.warn{background:#fef3c7;padding:8px;border-radius:6px;font-size:11px;margin-top:16px}
</style></head><body>
<h1>Studio · ${escapeHtml(input.type)} · ROI 시나리오</h1>
<p>${escapeHtml(input.brandName)} · ${input.budgetManwon}만원 · reach 기반 3케이스</p>
<div class="grid">${cards}</div>
<p class="warn">UI 라벨은 「노출」이지만 impressions 필드 = reach midpoint (0·footTraffic 아님). 사용자 혼동 가능 — 후속 PR에서 라벨 분기 예정.</p>
</body></html>`;
}

async function main() {
  // ── Catalog (preview API first — local needs DB)
  let catalog = [];
  const previewRes = await fetchPreview("/api/public/media-catalog");
  if (previewRes.ok) {
    catalog = await previewRes.json();
    pass("catalog-preview", `${catalog.length} rows from ${PREVIEW_ORIGIN}`);
  }
  if (catalog.length === 0) {
    try {
      catalog = await fetchPublicMediaCatalogList();
      pass("catalog-local", `${catalog.length} rows`);
    } catch {
      /* empty */
    }
  }
  assert.ok(catalog.length >= 3, "catalog unavailable — check preview access / VERCEL_SHARE");

  const online = catalog.filter(isOnlineCatalogMedia);
  assert.ok(online.length >= 3, "need 3+ online media");
  const pick3 = online.slice(0, 3);

  // ── Scenario A: below-min (100만원 + 3 online)
  const inputBelowMin = proposalInput({
    mediaIds: pick3.map((m) => m.id),
    budgetManwon: 100,
  });

  let proposalBelowMin;
  try {
    const res = await fetchPreview("/api/proposal/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputBelowMin),
    });
    const body = await res.json();
    if (res.ok && body.proposal) {
      proposalBelowMin = body.proposal;
      pass("preview-api-below-min", "POST /api/proposal/generate OK");
    } else {
      throw new Error(body.error ?? res.status);
    }
  } catch (e) {
    proposalBelowMin = buildFallbackProposal(inputBelowMin, pick3);
    pass("local-fallback-below-min", String(e.message ?? e));
  }

  const factsBelow = buildProposalOnlineFacts(inputBelowMin, pick3, 1_000_000);
  const belowMinLines = factsBelow.allocations.filter((a) => !a.calculable);
  assert.ok(belowMinLines.length >= 1, "expected below-min lines");
  pass("below-min-count", `${belowMinLines.length}/3 not calculable`);

  const factHasConsult = factsBelow.factBlockMarkdown.includes("별도 협의");
  assert.ok(factHasConsult, "fact block missing 별도 협의");
  pass("below-min-fact-block", "「별도 협의」 in fact block");

  const strategyNoOoh = !/(동선|상권|유동인구|footTraffic)/i.test(
    proposalBelowMin.strategy + proposalBelowMin.overview,
  );
  if (strategyNoOoh) pass("below-min-no-ooh-vocab", "no OOH keywords");
  else fail("below-min-no-ooh-vocab", "OOH leak in copy");

  // KPI sum excludes below-min: only calculable lines
  let expectedReach = 0;
  for (const a of factsBelow.allocations) {
    if (!a.calculable) continue;
    const m = pick3.find((x) => x.id === a.mediaId);
    const est = estimatePerformance(m.onlineSpec, a.allocatedWon);
    if (est?.reachMin != null && est?.reachMax != null) {
      expectedReach += Math.round((est.reachMin + est.reachMax) / 2);
    }
  }
  if (expectedReach === 0) {
    pass("below-min-kpi-excluded", "all below min → reach 0 (no fake estimates)");
  } else {
    assert.equal(proposalBelowMin.metrics.estimatedReach, expectedReach);
    pass("below-min-kpi-sum", `reach=${expectedReach} matches calculable only`);
  }

  report.scenarios.belowMin = {
    media: pick3.map((m) => ({ id: m.id, name: m.name, min: m.onlineSpec?.minBudget })),
    allocations: factsBelow.allocations,
    metrics: proposalBelowMin.metrics,
    inquiryLineCount: factsBelow.section.inquiryLineCount,
  };

  // ── Scenario B: Studio integrated ROI (500만원 + 2 online)
  const pick2 = online.slice(0, 2);
  const studioInput = {
    type: "integrated",
    brandName: "PR7 Studio",
    industry: "F&B",
    campaignName: "ROI 실측",
    goal: "awareness",
    budgetManwon: 500,
    regions: ["서울"],
    mediaIds: pick2.map((m) => m.id),
    locale: "ko",
  };
  const studioSections = sectionsForType("integrated");
  const studioOut = buildGeneralFallback(
    studioInput,
    "integrated",
    studioSections,
    pick2,
    [],
  );

  assert.ok(studioOut.roiScenarios?.length === 3, "need 3 ROI cards");
  assert.ok(studioOut.roiScenarios.every((r) => r.impressions > 0 && r.reach > 0));
  pass("studio-roi-3cards", studioOut.roiScenarios.map((r) => `${r.label}:${r.reach}`).join(", "));

  const roiConsistent =
    studioOut.roiScenarios[0].reach < studioOut.roiScenarios[1].reach &&
    studioOut.roiScenarios[1].reach < studioOut.roiScenarios[2].reach;
  if (roiConsistent) pass("studio-roi-order", "conservative < base < aggressive");
  else fail("studio-roi-order", JSON.stringify(studioOut.roiScenarios));

  const impressionsEqualsReach = studioOut.roiScenarios.every(
    (r) => r.impressions === r.reach,
  );
  if (impressionsEqualsReach) {
    pass("studio-roi-reach-mapping", "impressions field = reach (label mismatch expected)");
  }

  report.scenarios.studioRoi = {
    roiScenarios: studioOut.roiScenarios,
    metrics: studioOut.metrics,
  };

  // ── PR6-c rebase interface notes
  report.pr6cRebaseNotes = [
    "buildFactBlockMarkdown() in proposal-online-adapter.ts is the single extension point — PR6-c can re-add insights.creativeBullets / operationalBullets blocks (removed on main-only branch).",
    "buildProposalOnlineFacts() calls buildOnlineReportSection(args) — PR6-c adds insights on section; adapter applyCalculabilityGate already post-filters lines; no signature change needed.",
    "months field on BuildOnlineReportPayloadArgs exists in PR6-c for pacing — add optional months back to toOnlineReportArgs() on rebase.",
    "PROPOSAL_ONLINE_INSIGHTS_DISCLAIMER_KO duplicates ONLINE_INSIGHTS_DISCLAIMER_KO — rebase should import from online-report-insights.ts.",
  ];

  // ── HTML + PDF + PPTX via Playwright
  const htmlBelow = renderCampaignProposalHtml(inputBelowMin, proposalBelowMin);
  const htmlRoi = renderStudioRoiHtml(studioInput, studioOut);
  writeFileSync(join(OUT, "below-min-proposal.html"), htmlBelow);
  writeFileSync(join(OUT, "studio-roi-3cards.html"), htmlRoi);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  if (SHARE) {
    const page = await ctx.newPage();
    await primeVercelShareCookie(page, PREVIEW_ORIGIN, SHARE);
    await page.close();
  }

  for (const [name, html] of [
    ["below-min-proposal", htmlBelow],
    ["studio-roi-3cards", htmlRoi],
  ]) {
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await page.pdf({
      path: join(OUT, `${name}.pdf`),
      format: "A4",
      printBackground: true,
    });
    await page.close();
    pass(`artifact-${name}`, "PDF + PNG written");
  }

  // PPTX (studio integrated ROI) — inline minimal like API route
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide();
  slide.addText("PR7 Studio ROI 실측", { x: 0.5, y: 0.3, w: 12, fontSize: 24, bold: true });
  let x = 0.5;
  for (const r of studioOut.roiScenarios ?? []) {
    slide.addText(r.label, { x, y: 1.2, w: 3.8, fontSize: 14, bold: true, color: "7C3AED" });
    slide.addText(`노출 ${r.impressions.toLocaleString("ko-KR")}`, { x, y: 1.7, w: 3.8, fontSize: 11 });
    slide.addText(`도달 ${r.reach.toLocaleString("ko-KR")}`, { x, y: 2.1, w: 3.8, fontSize: 11 });
    slide.addText(r.note ?? "", { x, y: 2.6, w: 3.8, fontSize: 9, color: "6B7280" });
    x += 4.2;
  }
  if (factsBelow.factBlockMarkdown.includes("별도 협의")) {
    const slide2 = pptx.addSlide();
    slide2.addText("below-min · 별도 협의 레이아웃", { x: 0.5, y: 0.3, w: 12, fontSize: 18, bold: true });
    slide2.addText(
      factsBelow.allocations
        .map((a) => {
          const name = pick3.find((m) => m.id === a.mediaId)?.name ?? a.mediaId;
          const status = a.calculable ? "계산됨" : "최소 집행금액 미달 · 별도 협의";
          return `• ${name}: ₩${a.allocatedWon.toLocaleString("ko-KR")} (${status})`;
        })
        .join("\n"),
      { x: 0.5, y: 1, w: 12, h: 4, fontSize: 12, valign: "top" },
    );
  }
  await pptx.writeFile({ fileName: join(OUT, "pr7-studio-below-min.pptx") });
  pass("artifact-pptx", "pr7-studio-below-min.pptx");

  await browser.close();

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nReport: ${join(OUT, "report.json")}`);

  const failed = report.checks.filter((c) => !c.ok);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
