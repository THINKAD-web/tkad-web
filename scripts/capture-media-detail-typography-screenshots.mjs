#!/usr/bin/env node
/**
 * STEP 2 — media detail typography before/after screenshots.
 * Requires: npm run dev (default :3000)
 * node scripts/capture-media-detail-typography-screenshots.mjs [slug]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SLUG =
  process.argv[2] ?? "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";
const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(
  process.cwd(),
  "screenshots/media-detail-typography-step2",
);

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function capture(page, name, fullPage = true) {
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage,
  });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const url = `${BASE}/media/${SLUG}`;

  for (const [tag, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(60000);
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector(".tkad-media-page h1");
    await page.waitForTimeout(600);
    await capture(page, `${tag}-fold.png`, false);

    const execTab = page
      .locator(".tkad-media-page button, .tkad-media-page a")
      .filter({ hasText: /집행|Execution/i })
      .first();
    if (await execTab.count()) {
      await execTab.click().catch(() => {});
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const h2 = [...document.querySelectorAll(".tkad-media-page h2")].find(
          (el) => /상세 스펙|Specs/i.test(el.textContent || ""),
        );
        h2?.scrollIntoView({ block: "center" });
      });
      await page.waitForTimeout(300);
      await capture(page, `${tag}-specs.png`, false);
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
