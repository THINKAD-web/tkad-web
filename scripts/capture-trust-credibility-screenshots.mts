/**
 * fix/trust-credibility-urgent — D + A UX 검증 스크린샷.
 *
 *   npm run dev
 *   BASE=http://127.0.0.1:3000 npx tsx scripts/capture-trust-credibility-screenshots.mts
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../reports/trust-credibility-urgent",
);

const CASE_ID = "cmpmpv6s30002s82jlxjmt4i7";
const KPOP_SLUG = "koekseu-keipap-seukweeo-jeongwangpan-gwanggo";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/ko/cases/${CASE_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.waitForSelector("text=예시 시나리오", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: resolve(OUT, "01-case-detail-example-scenario.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/ko/media/${KPOP_SLUG}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: resolve(OUT, "02-kpop-detail-hero-cpm.png"),
    fullPage: false,
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(OUT, "03-kpop-detail-seo-related.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/ko`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.evaluate(() => {
    const el = document.getElementById("home-planner-coverage");
    el?.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: resolve(OUT, "04-home-coverage-digital-links.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/ko/pricing`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: resolve(OUT, "05-pricing-plans-api-limits.png"),
    fullPage: true,
  });

  console.log(`Screenshots saved under ${OUT}`);
  await browser.close();
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
