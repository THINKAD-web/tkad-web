import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "tmp", "filter-ia-verify");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(45000);

  const checks = [];

  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /^필터/ }).first().click();
  await page.waitForTimeout(800);
  const panelTypeDup = await page
    .locator('[role="dialog"] [data-screenshot="media-main-category"]')
    .count();
  checks.push({ name: "panel-no-type-dup", ok: panelTypeDup === 0 });

  const panelRegion = await page.getByText("인기", { exact: true }).count();
  checks.push({ name: "panel-has-popular-region", ok: panelRegion > 0 });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.goto(`${BASE}/media?mainCategory=ooh`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2000);
  const ledChip = page.getByRole("button", { name: "LED 스크린" });
  checks.push({
    name: "zero-sub-disabled",
    ok: (await ledChip.count()) > 0 && (await ledChip.first().isDisabled()),
  });

  await page.goto(`${BASE}/media?mainCategory=ooh`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(5000);
  const resultText = await page
    .locator('[data-screenshot="media-browse-filters"]')
    .locator("p")
    .filter({ hasText: /건 중|전체/ })
    .first()
    .textContent()
    .catch(() => null);
  checks.push({
    name: "result-label-clear",
    ok: Boolean(resultText && /건 중/.test(resultText)),
  });

  await page.goto(`${BASE}/media?mainCategory=ooh`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /^필터/ }).first().click();
  await page.waitForTimeout(500);
  const preset = page.getByRole("button", { name: "50~200만" });
  checks.push({ name: "price-preset-visible", ok: (await preset.count()) > 0 });

  await page.goto(`${BASE}/media?features=network`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  checks.push({
    name: "network-url-regression",
    ok: page.url().includes("features=network"),
  });

  await page.screenshot({ path: path.join(OUT, "verify-media-panel.png") });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.setDefaultTimeout(45000);
  await mobile.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await mobile.waitForTimeout(2000);
  await mobile.getByRole("button", { name: /^필터/ }).first().click();
  await mobile.waitForTimeout(1000);
  const sheetRegion = await mobile.getByText("인기", { exact: true }).count();
  checks.push({ name: "mobile-sheet-unified-region", ok: sheetRegion > 0 });

  await browser.close();

  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks, failed: failed.length }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
