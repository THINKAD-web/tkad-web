#!/usr/bin/env node
/**
 * STEP 3 — compare / quote typography screenshots.
 * Requires: npm run dev (default :3000)
 * node scripts/capture-compare-quote-typography-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(
  process.cwd(),
  "screenshots/compare-quote-typography-step3",
);

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function capture(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();

  for (const [tag, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(60000);

    await page.goto(`${BASE}/compare`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await capture(page, `${tag}-compare.png`, false);

    await page.goto(`${BASE}/quote`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await capture(page, `${tag}-quote-wizard.png`, false);

    await page.close();
  }

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
