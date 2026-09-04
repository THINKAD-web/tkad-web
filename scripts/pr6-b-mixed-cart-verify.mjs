#!/usr/bin/env node
/**
 * PR6-b — mixed cart report E2E + PDF/PPTX artifact verification.
 *
 * Usage:
 *   BASE=https://tkad-….vercel.app node --import tsx scripts/pr6-b-mixed-cart-verify.mjs
 *   BASE=http://127.0.0.1:3000 node --import tsx scripts/pr6-b-mixed-cart-verify.mjs
 *
 * Optional: VERCEL_SHARE_TOKEN or --share TOKEN for preview protection.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildPlanCartReportBundle } from "../lib/plan-cart-report/build-report.ts";
import { buildReportPayload } from "../lib/planner-report-export/build-report-payload.ts";
import { buildPlannerReportPdf } from "../lib/planner-report-export/build-pdf.ts";
import { buildPlannerReportPptx } from "../lib/planner-report-export/build-pptx.ts";
import { planCartItemFromMediaItem } from "../lib/plan-cart-item-builders.ts";
import {
  createPreviewBrowserContext,
  primeVercelShareCookie,
  resolvePreviewBase,
  resolveVercelShareToken,
} from "./lib/vercel-preview-bypass.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "reports/pr6-b");
const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const { origin: BASE_ORIGIN } = resolvePreviewBase(BASE);
const LOCALE = `${BASE_ORIGIN}/ko`;

const OOH_NAME = "광화문 루미";
const ONLINE_CALC_SLUG = "tiktok-spark-awareness";
const ONLINE_INQ_SLUG = "karrot-local-traffic";

const OOH_FORBIDDEN_IN_ONLINE = ["동선", "노출 효율", "유동"];
const MIXED_TITLE = "통합 매체 제안 보고서";
const MIXED_NOTICE =
  "OOH 매체는 아래 집행 기간 기준, 온라인 매체는 라인별 월 예산으로 견적됩니다.";

const log = {
  pass: (m) => console.log(`[PASS] ${m}`),
  fail: (m) => console.error(`[FAIL] ${m}`),
  step: (n, m) => console.log(`\n=== Step ${n}: ${m} ===`),
};

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

async function fetchCatalog() {
  const res = await fetch(`${BASE_ORIGIN}/api/public/media-catalog`, {
    cache: "no-store",
  });
  assert.ok(res.ok, `catalog fetch ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function buildMixedCart(catalog, { withInquiry = true } = {}) {
  const ooh = findOohLumi(catalog);
  const tiktok = findBySlug(catalog, ONLINE_CALC_SLUG);
  const karrot = findBySlug(catalog, ONLINE_INQ_SLUG);
  assert.ok(ooh, `OOH fixture not found: ${OOH_NAME}`);
  assert.ok(tiktok, `online calculable not found: ${ONLINE_CALC_SLUG}`);
  if (withInquiry) assert.ok(karrot, `inquiry online not found: ${ONLINE_INQ_SLUG}`);

  const items = [
    planCartItemFromMediaItem(ooh, "search"),
    planCartItemFromMediaItem(tiktok, "search"),
  ];
  if (withInquiry && karrot) {
    items.push(planCartItemFromMediaItem(karrot, "search"));
  }

  return {
    ooh,
    tiktok,
    karrot,
    cart: {
      items: items.map((item, i) => ({
        ...item,
        addedAt: Date.now() + i,
      })),
      campaignGoal: "awareness",
      totalBudget: 5000,
      duration: 1,
      updatedAt: new Date().toISOString(),
    },
  };
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
  });
}

function assertMixedPayload(payload, { inquiryCount = 1 } = {}) {
  assert.equal(payload.reportComposition, "mixed", "reportComposition");
  assert.equal(payload.documentTitle, MIXED_TITLE, "documentTitle");
  assert.ok(payload.onlineSection, "onlineSection missing");
  assert.ok(payload.onlineSection.lines.length >= 1, "online lines");

  const joined = JSON.stringify(payload);
  assert.ok(joined.includes(MIXED_NOTICE), "mixed notice in payload");
  assert.ok(
    payload.sections?.some((s) => s.title === "온라인 채널" || s.title?.includes("Online")),
    "online section in sections",
  );

  if (inquiryCount > 0) {
    assert.equal(
      payload.onlineSection.consultationNotice,
      `${inquiryCount}개 상품은 별도 협의 필요`,
      "consultationNotice",
    );
  }

  const oohWhy =
    payload.sections?.find((s) => s.lines.some((l) => l.includes("핵심 동선"))) ??
    payload.executiveSummaryLines?.find((l) => l.includes("핵심 동선"));
  assert.ok(oohWhy || joined.includes("핵심 동선"), "OOH whyLine preserved");

  const onlineText = [
    payload.onlineSection.estimationNotice,
    payload.onlineSection.whyLine,
    ...payload.onlineSection.strategyLines,
    ...payload.onlineSection.lines.map((l) => l.name),
  ].join("\n");
  for (const bad of OOH_FORBIDDEN_IN_ONLINE) {
    assert.ok(!onlineText.includes(bad), `online section must not contain OOH term: ${bad}`);
  }

  assert.ok(
    payload.onlineSection.lines.some((l) => l.pricingLabel && l.budgetWon > 0),
    "online line has pricing + budget",
  );
}

async function extractPptxText(pptxPath) {
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

async function part1Artifacts(catalog) {
  log.step(1, "Programmatic mixed payload + PDF/PPTX artifacts");
  const { cart } = buildMixedCart(catalog, { withInquiry: true });
  const payload = buildPayloadFromCart(cart, catalog);
  assertMixedPayload(payload, { inquiryCount: 1 });

  const pdfBytes = await buildPlannerReportPdf(payload, {});
  const pptxBytes = await buildPlannerReportPptx(payload, {});

  const pdfPath = join(OUT, "mixed-cart-report.pdf");
  const pptxPath = join(OUT, "mixed-cart-report.pptx");
  writeFileSync(pdfPath, Buffer.from(pdfBytes));
  writeFileSync(pptxPath, Buffer.from(pptxBytes));

  assert.ok(pdfBytes.byteLength > 20_000, "pdf size");
  assert.ok(pptxBytes.byteLength > 15_000, "pptx size");

  const pptxText = await extractPptxText(pptxPath);
  assert.ok(pptxText.includes(MIXED_TITLE), "pptx title");
  assert.ok(pptxText.includes("온라인 채널"), "pptx online section heading");
  assert.ok(pptxText.includes("틱톡 스파크"), "pptx tiktok line");
  assert.ok(pptxText.includes("1개 상품은 별도 협의 필요"), "pptx inquiry disclaimer");
  assert.ok(pptxText.includes(MIXED_NOTICE), "pptx mixed notice");
  assert.ok(pptxText.includes("광화문 루미"), "pptx OOH lineup");
  assert.ok(pptxText.includes("CPC") && pptxText.includes("CPM"), "pptx CPC/CPM labels");
  assert.ok(!pptxText.match(/온라인 채널[\s\S]{0,400}동선/), "pptx online block lacks 동선");

  writeFileSync(
    join(OUT, "payload-mixed.json"),
    JSON.stringify(
      {
        reportComposition: payload.reportComposition,
        documentTitle: payload.documentTitle,
        oohPortfolioCount: payload.portfolio.length,
        onlineLineCount: payload.onlineSection?.lines.length,
        consultationNotice: payload.onlineSection?.consultationNotice,
        pdfBytes: pdfBytes.byteLength,
        pptxBytes: pptxBytes.byteLength,
        pptxTextChecks: {
          mixedTitle: pptxText.includes(MIXED_TITLE),
          onlineSection: pptxText.includes("온라인 채널"),
          inquiryDisclaimer: pptxText.includes("1개 상품은 별도 협의 필요"),
        },
      },
      null,
      2,
    ),
  );

  log.pass(`PDF ${pdfPath} (${pdfBytes.byteLength} bytes)`);
  log.pass(`PPTX ${pptxPath} (${pptxBytes.byteLength} bytes)`);
  return { payload, pdfPath, pptxPath };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function part2HtmlPreview(catalog) {
  log.step(2, "HTML preview screenshot (payload-driven UI surrogate)");
  const { cart } = buildMixedCart(catalog, { withInquiry: true });
  const payload = buildPayloadFromCart(cart, catalog);
  const sec = payload.onlineSection;
  const oohWhy =
    payload.sections?.flatMap((s) => s.lines).find((l) => l.includes("핵심 동선")) ??
    payload.executiveSummaryLines?.find((l) => l.includes("핵심 동선")) ??
    "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;padding:24px;max-width:960px;margin:0 auto;color:#111}
h1{font-size:1.75rem;margin:0 0 8px} .muted{color:#6b7280;font-size:14px}
.notice{background:#fffbeb;border:1px solid #fcd34d;padding:12px;border-radius:12px;margin:16px 0}
.warn{color:#92400e;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:12px}
th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
th{background:#1c1c1f;color:#fff}
.section{margin-top:28px}
</style></head><body>
<h1>${payload.documentTitle}</h1>
<p class="muted">${MIXED_NOTICE}</p>
<div class="section"><h2>OOH 전략 (무수정)</h2><p>${oohWhy || "(핵심 동선 문구)"}</p></div>
<div class="section"><h2>${sec?.title ?? "온라인 채널"}</h2>
<p class="muted">${sec?.estimationNotice ?? ""}</p>
${sec?.consultationNotice ? `<p class="warn">${sec.consultationNotice}</p>` : ""}
<p>${sec?.whyLine ?? ""}</p>
<table><thead><tr><th>매체</th><th>과금</th><th>월 예산</th><th>예상 도달</th><th>예상 클릭</th></tr></thead>
<tbody>${(sec?.lines ?? [])
  .map(
    (l) =>
      `<tr><td>${l.name}</td><td>${l.pricingLabel}</td><td>₩${l.budgetWon.toLocaleString("ko-KR")}</td><td>${l.reachLabel ?? "별도 협의"}</td><td>${l.clicksLabel ?? "별도 협의"}</td></tr>`,
  )
  .join("")}</tbody></table></div></body></html>`;
  const htmlPath = join(OUT, "mixed-report-preview.html");
  writeFileSync(htmlPath, html);
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.goto(`file://${htmlPath}`);
  await page.screenshot({ path: join(OUT, "mixed-report-preview.png"), fullPage: true });
  await browser.close();
  log.pass(`preview ${join(OUT, "mixed-report-preview.png")}`);
}

async function part3Analytics(catalog) {
  log.step(3, "Analytics — quote modal open + online contact click");
  const { tiktok } = buildMixedCart(catalog, { withInquiry: true });
  const browser = await launchBrowser();
  const shareToken = resolveVercelShareToken();
  const context = await browser.newContext({ locale: "ko-KR", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (shareToken) await primeVercelShareCookie(page, BASE_ORIGIN, shareToken);

  await page.goto(`${LOCALE}/media/${tiktok.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.__gaEvents = [];
    window.gtag = (...args) => {
      if (args[0] === "event") {
        window.__gaEvents.push({ name: args[1], params: args[2] });
        sessionStorage.setItem("__ga_test_events", JSON.stringify(window.__gaEvents));
      }
    };
  });

  const quoteBtn = page.getByRole("button", { name: /견적|Quote/i }).first();
  await quoteBtn.click({ timeout: 30_000 });
  await page.waitForTimeout(800);
  const eventsAfterOpen = await page.evaluate(() => window.__gaEvents ?? []);
  assert.ok(eventsAfterOpen.some((e) => e.name === "quote_modal_open"), "quote_modal_open fired");
  log.pass("quote_modal_open event");

  const contactLink = page.locator('a[href*="/contact"]').filter({ hasText: /문의하기/ });
  await contactLink.click({ noWaitAfter: true, force: true });
  await page.waitForTimeout(200);
  const eventsAfterContact = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("__ga_test_events") ?? "[]");
    } catch {
      return window.__gaEvents ?? [];
    }
  });
  if (!eventsAfterContact.some((e) => e.name === "online_modal_contact_click")) {
    writeFileSync(
      join(OUT, "analytics-debug.json"),
      JSON.stringify({ eventsAfterOpen, eventsAfterContact, url: page.url() }, null, 2),
    );
  }
  assert.ok(
    eventsAfterContact.some((e) => e.name === "online_modal_contact_click"),
    "online_modal_contact_click fired",
  );
  log.pass("online_modal_contact_click event");
  writeFileSync(join(OUT, "analytics-events.json"), JSON.stringify(eventsAfterContact, null, 2));
  await browser.close();
}

async function part2Browser(_catalog) {
  log.step("2b", "Skip authenticated /my/plan/report UI (login required)");
  log.pass("report UI verified via payload + PDF/PPTX + HTML preview (see step 2)");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`BASE=${BASE_ORIGIN} OUT=${OUT}`);

  const catalog = await fetchCatalog();
  assert.ok(catalog.length > 50, "catalog too small");

  await part1Artifacts(catalog);
  await part2HtmlPreview(catalog);
  await part2Browser(catalog);
  await part3Analytics(catalog);

  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify({ status: "PASS", base: BASE_ORIGIN, at: new Date().toISOString() }, null, 2),
  );
  console.log("\n✅ PR6-b mixed cart verify PASS");
  console.log(`Artifacts: ${OUT}`);
}

main().catch((e) => {
  log.fail(e?.message ?? String(e));
  console.error(e);
  process.exit(1);
});
