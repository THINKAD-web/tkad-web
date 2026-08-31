#!/usr/bin/env node
/**
 * STEP 1 — /planner brief flow typography screenshots (desktop + mobile).
 * Requires: npm run dev on :3000
 * node scripts/capture-planner-brief-typography-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "screenshots/planner-brief-typography-step1");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function capture(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: true,
  });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();

  for (const [tag, viewport] of [
    ["desktop", { width: 1280, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(45000);

    await page.goto(`${BASE}/planner`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await capture(page, `${tag}-step1-brief.png`);

    const budget = page.locator('input[inputmode="numeric"]').first();
    if (await budget.count()) {
      await budget.fill("5000");
      await budget.blur();
    }
    await page.waitForTimeout(400);

    const next = page
      .getByRole("button", { name: /다음 · 믹스|Next · Edit mix/i })
      .filter({ hasNot: page.locator("[disabled]") })
      .first();
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(1200);
      await capture(page, `${tag}-step2-mix.png`);
    } else {
      console.warn(`${tag}: step2 skip — required fields incomplete`);
    }

    await page.close();
  }

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
