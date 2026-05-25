import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3456/ko";
const OUT = path.join(process.cwd(), "screenshots/redesign");

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
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log("Capturing home...");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(OUT, "01-home-mobile.png"),
    fullPage: true,
  });

  const categories = page.locator('[data-screenshot="categories"]');
  if (await categories.count()) {
    await categories.screenshot({
      path: path.join(OUT, "02-home-categories.png"),
    });
  }

  console.log("Capturing media browse...");
  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, "03-media-browse-list.png"),
    fullPage: true,
  });

  console.log("Capturing media detail...");
  const cardLink = page.locator('a[href*="/media/"]').first();
  if (await cardLink.count()) {
    await cardLink.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(OUT, "04-media-detail.png"),
      fullPage: false,
    });
  }

  await browser.close();
  console.log("Done:", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
