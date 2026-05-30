import { chromium } from "playwright";
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

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(45000);

  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const oohMain = page.getByRole("button", { name: /^옥외|^OOH/i }).first();
  if (await oohMain.count()) {
    await oohMain.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT, "media-browse-ooh-sub.png"),
      fullPage: false,
    });
  }

  const seoulMain = page.getByRole("button", { name: /^서울/ }).first();
  if (await seoulMain.count()) {
    await seoulMain.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT, "media-browse-seoul-sub.png"),
      fullPage: false,
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    `${BASE}/media?mainCategory=transit&subCategory=subway_station&regionMain=seoul&regionSub=seoul_gangnam`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, "media-browse-desktop-filters.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Screenshots saved under tmp/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
