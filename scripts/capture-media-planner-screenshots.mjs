import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "tmp");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function clickNext(page) {
  const next = page.locator("button, a").filter({ hasText: /^다음$|^Next$/ }).last();
  await next.click({ timeout: 15000 });
  await page.waitForTimeout(900);
}

async function captureMediaScreenshots(page) {
  console.log("Media feed mode...");
  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("tkad_media_view_mode", "feed");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator('[data-screenshot="media-view-feed"]').screenshot({
    path: path.join(OUT, "media-feed-mode.png"),
  });

  console.log("Media card mode...");
  await page.evaluate(() => {
    localStorage.setItem("tkad_media_view_mode", "card");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator('[data-screenshot="media-view-card"]').screenshot({
    path: path.join(OUT, "media-card-mode.png"),
  });

  console.log("Media compact mode...");
  await page.evaluate(() => {
    localStorage.setItem("tkad_media_view_mode", "compact");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator('[data-screenshot="media-view-compact"]').screenshot({
    path: path.join(OUT, "media-compact-mode.png"),
  });
}

async function capturePlannerScreenshots(page) {
  console.log("Planner sub nav...");
  await page.goto(`${BASE}/planner`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.locator('[data-screenshot="planner-sub-nav"]').screenshot({
    path: path.join(OUT, "planner-sub-tabs.png"),
  });

  console.log("Planner wizard to step 6 report...");
  await page.getByRole("button", { name: "브랜드 인지도" }).click();
  await clickNext(page);
  await clickNext(page);
  await clickNext(page);

  const addAll = page.getByRole("button", { name: "전체 담기" });
  await addAll.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);
  if (!(await addAll.isDisabled())) {
    await addAll.click();
    await page.waitForTimeout(800);
  } else {
    await page.getByRole("button", { name: "담기" }).first().click();
    await page.waitForTimeout(800);
  }
  await clickNext(page);
  await clickNext(page);

  await page.locator('[data-screenshot="planner-report-unified"]').waitFor({
    state: "visible",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  const blur = page.locator('[data-screenshot="planner-pro-blur"]');
  await blur.scrollIntoViewIfNeeded();
  await blur.screenshot({ path: path.join(OUT, "planner-pro-blur.png") });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  await captureMediaScreenshots(page);
  await capturePlannerScreenshots(page);

  await browser.close();
  console.log("Done:", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
