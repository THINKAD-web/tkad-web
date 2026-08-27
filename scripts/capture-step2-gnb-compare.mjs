#!/usr/bin/env node
/**
 * STEP 2 GNB compare — capture Before (production), Set 1, Set 3
 * for home + media browse desktop (1280×900 viewport).
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const PROD_BASE = (process.env.PROD_BASE ?? "https://tkad.co.kr").replace(/\/$/, "");
const LOCAL_BASE = (process.env.LOCAL_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/design-tone-audit-20260826/screenshots",
);

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip", "Accept", "Got it"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function waitForMediaCards(page) {
  await page
    .locator('[data-testid="media-card"], .media-view-card, article, [data-screenshot="media-mobile-sticky-controls"]')
    .first()
    .waitFor({ timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
}

async function capture(page, url, outFile, opts = {}) {
  const { expectAccentSet, waitMedia } = opts;
  console.log("→", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(waitMedia ? 6000 : 4000);
  await dismissOverlays(page);
  if (expectAccentSet) {
    await page.waitForFunction(
      (set) => document.documentElement.dataset.qpAccentSet === set,
      expectAccentSet,
      { timeout: 15000 },
    );
  } else if (expectAccentSet === null) {
    await page.waitForFunction(
      () => !document.documentElement.dataset.qpAccentSet,
      { timeout: 5000 },
    ).catch(() => {});
  }
  if (waitMedia) await waitForMediaCards(page);
  const file = path.join(OUT, outFile);
  await page.screenshot({ path: file, fullPage: false });
  console.log("  saved", outFile);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(120000);

  // Before — current production (#FF6200 original)
  await capture(page, `${PROD_BASE}/ko`, "02-home-desktop.png");
  await capture(page, `${PROD_BASE}/ko/media`, "03-media-browse-desktop.png", {
    waitMedia: true,
  });

  // Set 1 — rebased branch, default (no ?gnbSet)
  await capture(page, `${LOCAL_BASE}/ko`, "02-home-desktop-step2-set1.png", {
    expectAccentSet: null,
  });
  await capture(page, `${LOCAL_BASE}/ko/media`, "03-media-browse-desktop-step2-set1.png", {
    expectAccentSet: null,
    waitMedia: true,
  });

  // Set 3 — ?gnbSet=3
  await capture(page, `${LOCAL_BASE}/ko?gnbSet=3`, "02-home-desktop-step2-set3.png", {
    expectAccentSet: "3",
  });
  await capture(
    page,
    `${LOCAL_BASE}/ko/media?gnbSet=3`,
    "03-media-browse-desktop-step2-set3.png",
    { expectAccentSet: "3", waitMedia: true },
  );

  await browser.close();
  console.log("\nAll screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
