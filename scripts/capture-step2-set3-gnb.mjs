#!/usr/bin/env node
/** Capture STEP 2 Set 3 GNB trial screenshots (home + media browse). */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/design-tone-audit-20260826/screenshots",
);

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip", "Accept"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/ko?gnbSet=3`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(4000);
  await dismissOverlays(page);
  await page.waitForFunction(
    () => document.documentElement.dataset.qpAccentSet === "3",
    { timeout: 10000 },
  );
  await page.screenshot({
    path: path.join(OUT, "02-home-desktop-step2-set3.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/ko/media?gnbSet=3`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(6000);
  await dismissOverlays(page);
  await page.waitForFunction(
    () => document.documentElement.dataset.qpAccentSet === "3",
    { timeout: 10000 },
  );
  await page.locator('[data-testid="media-card"], .media-view-card, article').first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(OUT, "03-media-browse-desktop-step2-set3.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Saved Set 3 screenshots to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
