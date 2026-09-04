/**
 * PR5-c commit 7 — regression: digital panel must use live local mix, not benchmark fallback.
 *
 * Usage:
 *   npm run dev
 *   npx tsx scripts/capture-o1-digital-fallback.mts
 *   BASE=http://127.0.0.1:3000 npx tsx scripts/capture-o1-digital-fallback.mts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { e2eMixBypassHeaders } from "./lib/e2e-mix-bypass.mjs";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const LOCALE = `${BASE}/ko`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: e2eMixBypassHeaders(),
  });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${LOCALE}/planner`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /자세히 설계/ }).click();
  await page.getByRole("button", { name: "OOH + 디지털" }).click();
  await page.locator('input[placeholder="3000"]').fill("5000");
  await page.locator('input[type="date"]').first().fill("2026-09-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-09-30");
  await page.getByRole("button", { name: "다음 · 믹스 편집", exact: true }).click();

  await page.waitForSelector('[data-testid="brief-digital-panel"]', {
    timeout: 60_000,
  });
  await page.locator('[data-testid="brief-mix-card-add"]').first().click();
  await page.waitForSelector('[data-allocation-source="live"]', {
    timeout: 90_000,
  });

  const allocationSource = await page
    .locator("[data-allocation-source]")
    .getAttribute("data-allocation-source");
  assert.equal(allocationSource, "live", "must use live local mix API");

  const catalogSource = await page
    .locator('[data-testid="brief-digital-channel-grid"]')
    .getAttribute("data-catalog-source");
  assert.equal(catalogSource, "live", "catalog meta must be live (local DB)");

  const benchmarkNote = await page
    .locator('[data-testid="brief-digital-benchmark-note"]')
    .count();
  assert.equal(benchmarkNote, 0, "benchmark fallback note must not appear");

  console.log(
    JSON.stringify(
      {
        pass: true,
        base: BASE,
        allocationSource,
        catalogSource,
        regression: "no dmpilot/static/benchmark fallback after commit 7",
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
