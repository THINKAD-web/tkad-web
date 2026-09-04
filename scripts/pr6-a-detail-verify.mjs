#!/usr/bin/env node
/**
 * PR6-a — online detail layout, billing labels, OOH tabs absent, mobile bar.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = join(process.cwd(), "reports/pr6-a/step2-dry-run");

const CASES = [
  {
    slug: "ig-awareness-reach",
    kind: "calculable",
    billingExpect: "CPC · CPM",
    priceExpect: "CPC 200~600원 · CPM 4,000~8,000원",
  },
  {
    slug: "baemin-ad-visit",
    kind: "inquiry-mixed-billing",
    billingExpect: "CPC · 정률 · 정액",
    priceExpect: "가격 문의",
  },
  {
    slug: "kakao-traffic",
    kind: "calculable",
    billingExpect: "CPC · CPM",
    priceExpect: "CPC 150~450원 · CPM 2,500~5,500원",
  },
];

const OOH_CHECK = "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function verifyOnline(page, c) {
  await page.goto(`${BASE}/ko/media/${c.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector("h1", { timeout: 90_000 });
  await page.waitForTimeout(800);

  const body = await page.locator("body").innerText();
  const issues = [];

  if (body.includes("위치 미확인")) issues.push("ooh-map-notice");
  if (body.includes("유동인구")) issues.push("ooh-traffic-tab-label");
  if (body.includes("가용 캘린더")) issues.push("ooh-calendar-tab");
  if (body.includes("집행 검증")) issues.push("ooh-verified-badge");
  if (!body.includes("과금방식") && !body.includes("Billing")) {
    issues.push("spec-table-missing");
  }
  if (!body.includes(c.billingExpect)) {
    issues.push(`billing-mismatch:${c.billingExpect}`);
  }
  if (c.kind.startsWith("calculable")) {
    if (!body.includes("예상 성과")) issues.push("performance-panel-missing");
    if (!body.includes(c.priceExpect)) issues.push("price-missing");
  } else if (!body.includes(c.priceExpect)) {
    issues.push(`inquiry-price:${c.priceExpect}`);
  }

  await page.screenshot({
    path: join(OUT, `desktop-${c.slug}.png`),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mobilePrice = await page
    .locator('[aria-label="빠른 문의"], [aria-label="Quick contact"]')
    .first()
    .innerText()
    .catch(() => "");
  if (c.kind.startsWith("calculable") && !mobilePrice.includes("CPC")) {
    issues.push("mobile-bar-no-cpc");
  }
  if (c.kind === "inquiry-mixed-billing" && !mobilePrice.includes("가격 문의")) {
    issues.push("mobile-bar-not-inquiry");
  }
  await page.screenshot({
    path: join(OUT, `mobile-${c.slug}.png`),
    fullPage: false,
  });

  return { slug: c.slug, issues, mobilePriceSnippet: mobilePrice.slice(0, 80) };
}

async function verifyOohRegression(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/ko/media/${OOH_CHECK}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector("h1", { timeout: 90_000 });
  await page.waitForTimeout(800);
  const body = await page.locator("body").innerText();
  const hasOohTab =
    body.includes("집행") ||
    body.includes("유동인구") ||
    body.includes("위치") ||
    body.includes("Traffic") ||
    body.includes("Execution");
  return { pass: hasOohTab, bodySnippet: body.slice(0, 200) };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const online = {};
  for (const c of CASES) {
    online[c.slug] = await verifyOnline(page, c);
  }
  const ooh = await verifyOohRegression(page);

  await browser.close();

  const allIssues = Object.values(online).flatMap((r) =>
    r.issues.length ? r.issues.map((i) => `${r.slug}:${i}`) : [],
  );

  const report = {
    pass: allIssues.length === 0 && ooh.pass,
    base: BASE,
    online,
    oohRegression: ooh,
    issueCount: allIssues.length,
    issues: allIssues,
    screenshotsDir: OUT,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
