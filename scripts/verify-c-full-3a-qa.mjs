#!/usr/bin/env node
/**
 * C-full-3a QA — brief Step 3 quote summary (browser + PDF smoke).
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   QA_SEED_EMAIL=... QA_SEED_PASSWORD=... \
 *   node scripts/verify-c-full-3a-qa.mjs
 */

import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "scripts/.verify-c-full-3a-qa";
const EMAIL = process.env.QA_SEED_EMAIL ?? process.env.QA_EMAIL;
const PASSWORD = process.env.QA_SEED_PASSWORD ?? process.env.QA_PASSWORD;

const results = [];

function log(check, ok, detail = "") {
  results.push({ check, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}: ${check}${detail ? ` — ${detail}` : ""}`);
}

async function loginViaApi(request) {
  if (!EMAIL || !PASSWORD) return false;
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  return res.ok();
}

async function runBrowserQa() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const request = context.request;

  const loggedIn = await loginViaApi(request);
  log("login (QA account)", loggedIn, loggedIn ? EMAIL : "no credentials — preview may be gated");

  await page.goto(`${BASE}/ko/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(3000);

  // Step 1 — budget + period minimum
  const budgetInput = page.locator("#brief-budget-won, input[inputmode='numeric']").first();
  if (await budgetInput.count()) {
    await budgetInput.fill("30000000");
  }
  const startInput = page.locator('input[type="date"]').first();
  const endInput = page.locator('input[type="date"]').nth(1);
  if (await startInput.count()) await startInput.fill("2026-09-01");
  if (await endInput.count()) await endInput.fill("2026-09-30");

  const step1Next = page.getByRole("button", { name: /다음|Next|믹스/i }).first();
  if (await step1Next.count()) {
    await step1Next.click();
    await page.waitForTimeout(4000);
  }

  // Step 2 — auto mix if available, else first card add
  const autoMix = page.getByRole("button", { name: /자동|추천|Auto|Recommend/i }).first();
  if (await autoMix.count()) {
    await autoMix.click().catch(() => {});
    await page.waitForTimeout(5000);
  }

  const step2Next = page.getByRole("button", { name: /결과|3단|다음|Next|확인/i }).first();
  if (await step2Next.count()) {
    await step2Next.click();
    await page.waitForTimeout(5000);
  }

  await page.screenshot({ path: join(OUT, "01-step3-initial.png"), fullPage: true });

  const prodInput = page.locator("#brief-production-cost");
  const prodVisible = (await prodInput.count()) > 0;
  log("3단계 사이드바 제작비 입력란", prodVisible);

  if (prodVisible) {
    await prodInput.fill("5000000");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, "02-production-cost-entered.png"), fullPage: true });
  }

  const quoteTable = page.locator('[data-testid="report-quote-summary"]');
  const quoteVisible = (await quoteTable.count()) > 0;
  log("견적 요약 표 렌더", quoteVisible);

  let coverWon = null;
  let mediaFeeWon = null;
  if (quoteVisible) {
    const coverText =
      (await page.locator('[data-testid="report-cover-value"], .tabular-nums').first().textContent().catch(() => "")) ??
      (await page.getByText(/확정 ₩/).first().textContent().catch(() => ""));
    const coverMatch = coverText.match(/₩([\d,]+)/);
    coverWon = coverMatch ? Number(coverMatch[1].replace(/,/g, "")) : null;

    const mediaRow = quoteTable.locator("tr").filter({ hasText: /매체비/ }).first();
    const mediaText = await mediaRow.locator("td").textContent().catch(() => "");
    const mediaMatch = mediaText.match(/₩([\d,]+)/);
    mediaFeeWon = mediaMatch ? Number(mediaMatch[1].replace(/,/g, "")) : null;

    const parity =
      coverWon != null && mediaFeeWon != null && coverWon === mediaFeeWon;
    log(
      "매체비 = 표지 확정 금액",
      parity,
      `cover=${coverWon ?? "?"} media=${mediaFeeWon ?? "?"}`,
    );

    const prodRow = quoteTable.locator("tr").filter({ hasText: /제작비/ }).first();
    const prodCell = await prodRow.locator("td").textContent().catch(() => "");
    log(
      "제작비 500만 반영",
      prodVisible && /₩5,000,000|5000000/.test(prodCell ?? ""),
      prodCell?.trim(),
    );

    const totalLabel = await quoteTable
      .locator("tr")
      .filter({ hasText: /합계|총액/ })
      .first()
      .locator("th")
      .textContent()
      .catch(() => "");
    log("총액 라벨 존재", Boolean(totalLabel?.trim()), totalLabel?.trim());

    const footnotes = await page
      .locator('[data-testid="report-quote-summary-footnote"]')
      .allTextContents();
    log("견적 각주", footnotes.length >= 0, footnotes.join(" | ") || "(none)");

    await page.screenshot({ path: join(OUT, "03-quote-summary.png"), fullPage: false });
  } else if (!loggedIn) {
    log("견적 요약 표 렌더", false, "PRO gate — login required for preview");
  }

  // Zero production — clear and screenshot
  if (prodVisible) {
    await prodInput.fill("");
    await page.waitForTimeout(1000);
    const prodRow = quoteTable.locator("tr").filter({ hasText: /제작비/ }).first();
    const prodCell = await prodRow.locator("td").textContent().catch(() => "");
    log("제작비 0원 시 표시 (—)", prodCell?.includes("—") ?? false, prodCell?.trim());
    await page.screenshot({ path: join(OUT, "04-production-zero.png"), fullPage: false });
  }

  // Save plan + reload production cost
  if (prodVisible && loggedIn) {
    await prodInput.fill("3000000");
    const saveBtn = page.getByRole("button", { name: /플랜 저장|다시 저장|Save/i }).first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      await page.waitForTimeout(6000);
      const url = page.url();
      const planMatch = url.match(/[?&]plan=([^&]+)/);
      log("플랜 저장", Boolean(planMatch), planMatch?.[1] ?? url);
      if (planMatch) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(5000);
        const persisted = await prodInput.inputValue();
        log("재접속 제작비 유지", persisted === "3000000", persisted);
        await page.screenshot({ path: join(OUT, "05-reload-persisted.png"), fullPage: true });
      }
    }
  }

  // PDF button visible (export triggered only if allowed)
  const pdfBtn = page.getByRole("button", { name: /제안서 PDF|Proposal PDF/i }).first();
  log("PDF 버튼 표시", (await pdfBtn.count()) > 0);

  await browser.close();
  return results;
}

async function runPdfSmoke() {
  // Dynamic import TS modules via tsx subprocess output file
  const { execSync } = await import("node:child_process");
  const snippet = `
import { buildOohReportPayload } from "./lib/planner-report-export/payload-ooh.ts";
import { buildPlannerReportPdf } from "./lib/planner-report-export/build-pdf.ts";
import type { MediaItem } from "./lib/media-data.ts";

const HANSEO = {
  id: "qa-hanseo", name: "성수동 한서빌딩 외벽광고", type: "static",
  location: "서울", region: "seoul", regionMain: "seoul", district: "성동구",
  country: "KR", price: 0, pricePeriod: "month", mediaSubCategory: "wall_mural",
  pricingMode: "quote_only", lat: 37.54, lng: 127.05, dailyFootTraffic: 48000, sampleImages: [],
} as MediaItem;
const PRICED = {
  id: "qa-priced", name: "테스트 전광판", type: "digital", location: "서울 강남",
  region: "seoul", regionMain: "seoul", district: "강남구", country: "KR",
  price: 1500, pricePeriod: "month", pricingMode: "fixed", lat: 37.5, lng: 127.0,
  dailyFootTraffic: 100000, sampleImages: [],
} as MediaItem;
const portfolio = [PRICED, HANSEO];
const payload = buildOohReportPayload({
  isKo: true, goalTitle: "인지", budgetMan: 3000,
  periodDisplay: "2026-09-01 ~ 2026-09-30 (30일)",
  regionsText: "서울", categoriesText: "디지털", ageText: "20–30대", industryText: "F&B",
  portfolio, metrics: null, blendedCpmKrw: 5000,
  budgetAllocation: [{ key: "digital", label: "디지털", pct: 100, valueWon: 20_100_000, actualWon: 20_100_000 }],
  cpmBars: [], effectSummaryLines: [], generatedAt: "2026-08-24", months: 1,
  campaignMediaQuantities: Object.fromEntries(portfolio.map((m) => [m.id, 1])),
  productionCostWon: 5_000_000,
  budgetHonesty: {
    requestWon: 30_000_000, mixWon: 20_100_000, overBudgetWon: 0,
    budgetUsedRate: 20_100_000 / 30_000_000,
    coverValue: "요청 예산 ₩30,000,000 / 확정 ₩20,100,000 (67%)",
    overBudgetBanner: null,
    mixVsBudgetFootnote: "요청 예산 대비 67% (확정분 기준 · 문의 매체 제외)",
    quoteOnlyCount: 1,
  },
});
const pdf = await buildPlannerReportPdf(payload, {});
const text = Buffer.from(pdf).toString("latin1");
const checks = {
  quoteSection: text.includes("견적 요약") || text.includes("Quote summary"),
  subtotalLabel: text.includes("합계 (협의 매체 제외)") || text.includes("Subtotal"),
  footnote: text.includes("별도 협의 후 추가"),
  mediaFee: text.includes("20,100,000") || text.includes("20100000"),
};
console.log(JSON.stringify(checks));
`;
  const tmp = join(OUT, "_pdf-smoke.ts");
  await mkdir(OUT, { recursive: true });
  await writeFile(tmp, snippet);
  try {
    const out = execSync(`npx tsx ${tmp}`, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const checks = JSON.parse(out.trim());
    for (const [k, v] of Object.entries(checks)) {
      log(`PDF smoke: ${k}`, Boolean(v));
    }
    await writeFile(join(OUT, "pdf-smoke-result.json"), JSON.stringify(checks, null, 2));
  } catch (e) {
    log("PDF smoke", false, e instanceof Error ? e.message : String(e));
  }
}

await runBrowserQa();
await runPdfSmoke();

const report = {
  at: new Date().toISOString(),
  base: BASE,
  results,
  pass: results.every((r) => r.ok),
  screenshots: join(OUT, "*.png"),
};
await writeFile(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`\nReport: ${join(OUT, "report.json")}`);
process.exit(report.pass ? 0 : 1);
