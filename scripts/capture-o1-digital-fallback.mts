/**
 * O-1 env 미설정 폴백 UI 캡처 — INTEGRATION_SERVICE_SECRET / DIGITAL_ORIGIN 없을 때.
 * Usage: npx tsx scripts/capture-o1-digital-fallback.mts
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "reports", "screenshots-o1-fallback");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/ko/planner`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[placeholder="3000"]', { timeout: 15_000 });

  // Step 1 — channel toggle
  await page.getByRole("button", { name: "OOH + 디지털" }).click();
  await page.fill('input[placeholder="3000"]', "5000");
  await page.locator('input[type="date"]').first().fill("2026-08-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-08-31");
  await page.screenshot({
    path: path.join(OUT, "01-step1-channel-toggle.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "다음 · 믹스 편집" }).click();
  await page.waitForSelector('[data-testid="brief-digital-panel"]', {
    timeout: 15_000,
  });

  // Wait for mix attempt to settle (live or benchmark)
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(OUT, "02-step2-digital-panel.png"),
    fullPage: true,
  });

  const source = await page
    .locator("[data-allocation-source]")
    .getAttribute("data-allocation-source");
  const benchmarkNote = await page
    .locator('[data-testid="brief-digital-benchmark-note"]')
    .count();

  console.log(JSON.stringify({ source, benchmarkNoteVisible: benchmarkNote > 0 }, null, 2));
  console.log(`Screenshots saved to ${OUT}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
