#!/usr/bin/env node
/** Option A — /ko/media before (production) vs after (local option-a) */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const PROD = (process.env.PROD_BASE ?? "https://tkad.co.kr").replace(/\/$/, "");
const LOCAL = (process.env.LOCAL_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/design-tone-audit-20260826/screenshots/option-a-media",
);

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function captureMedia(page, base, name) {
  await page.goto(`${base}/ko/media`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(8000);
  await dismissOverlays(page);
  await page
    .locator(".media-accent-option-a, [data-screenshot='media-mobile-sticky-controls'], article")
    .first()
    .waitFor({ timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await captureMedia(page, PROD, "01-media-before-production.png");
  await captureMedia(page, LOCAL, "02-media-after-option-a.png");

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
