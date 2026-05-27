#!/usr/bin/env node
/**
 * Capture home content feed + report/cases list cards.
 * Usage: node scripts/capture-content-cards-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const OUT = process.cwd();

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR" });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE}/ko`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);

  const trendHeading = page.getByRole("heading", { name: "트렌드 리포트" });
  if (await trendHeading.count()) {
    await trendHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const trendSection = trendHeading.locator("xpath=ancestor::div[contains(@class,'py-4')][1]");
    await trendSection.screenshot({ path: path.join(OUT, "home-trend-cards-mobile.png") });
  }

  const casesHeading = page.getByRole("heading", { name: "성공 사례" });
  if (await casesHeading.count()) {
    await casesHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const casesSection = casesHeading.locator("xpath=ancestor::div[contains(@class,'py-4')][1]");
    await casesSection.screenshot({ path: path.join(OUT, "home-cases-cards-mobile.png") });
  }

  await page.goto(`${BASE}/ko/report`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, "report-list-mobile.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/ko/cases`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy(0, 720));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "cases-list-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Saved screenshots to repo root");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
