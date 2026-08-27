import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "tmp", "discovery-network-targets-verify");

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

  checks.push({
    name: "desktop-segment-removed",
    ok:
      (await page.locator('[data-screenshot="media-catalog-browse-segment"]').count()) ===
      0,
  });

  await page.goto(`${BASE}/media?features=network`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const networkTypeChips = await page
    .locator('[data-screenshot="media-main-category"]')
    .getByRole("button", { name: "디지털" })
    .count();
  checks.push({
    name: "network-url-type-chips",
    ok: networkTypeChips > 0,
  });

  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const hotspotChip = page.locator('[data-screenshot="media-network-hotspot-chip"]');
  checks.push({
    name: "network-hotspot-chip-removed",
    ok: (await hotspotChip.count()) === 0,
  });

  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const hubLink = page.getByRole("link", { name: "캠페인 목적에서 시작" });
  checks.push({ name: "targets-hub-link", ok: (await hubLink.count()) > 0 });
  await Promise.all([
    page.waitForURL("**/media/targets**"),
    hubLink.click(),
  ]);
  checks.push({
    name: "targets-hub-navigation",
    ok: page.url().includes("/media/targets"),
  });

  await page.goto(
    `${BASE}/media?priceMin=999999999`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(5000);
  const emptyCta = page.getByRole("link", { name: "목적별로 찾아보기" });
  checks.push({ name: "empty-targets-cta", ok: (await emptyCta.count()) > 0 });
  await Promise.all([
    page.waitForURL("**/media/targets**"),
    emptyCta.click(),
  ]);
  checks.push({
    name: "empty-targets-navigation",
    ok: page.url().includes("/media/targets"),
  });

  await page.goto(`${BASE}/media?features=network`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  checks.push({
    name: "network-url-regression",
    ok:
      page.url().includes("features=network") &&
      (await page.locator('[data-screenshot="media-catalog-browse-segment"]').count()) ===
        0 &&
      (await page
        .locator('[data-screenshot="media-main-category"]')
        .getByRole("button", { name: "디지털" })
        .count()) > 0,
  });

  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const footerLink = page.locator('[data-screenshot="media-targets-footer-link"]');
  checks.push({ name: "targets-footer-link", ok: (await footerLink.count()) > 0 });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.setDefaultTimeout(45000);
  await mobile.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await mobile.waitForTimeout(2000);
  checks.push({
    name: "mobile-segment-removed",
    ok:
      (await mobile.locator('[data-screenshot="media-catalog-browse-segment"]').count()) ===
      0,
  });
  checks.push({
    name: "mobile-targets-hub-link",
    ok: (await mobile.locator('[data-screenshot="media-targets-hub-link"]').count()) > 0,
  });

  await page.screenshot({ path: path.join(OUT, "verify-desktop.png") });
  await mobile.screenshot({ path: path.join(OUT, "verify-mobile.png") });

  await browser.close();

  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks, failed: failed.length }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
