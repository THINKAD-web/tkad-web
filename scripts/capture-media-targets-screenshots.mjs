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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(45000);

  console.log("Capturing /media sub-tabs...");
  await page.goto(`${BASE}/media`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const subTabs = page.locator(".sticky.top-14");
  if (await subTabs.count()) {
    await subTabs.first().screenshot({
      path: path.join(OUT, "media-discovery-subtabs.png"),
    });
  } else {
    await page.screenshot({
      path: path.join(OUT, "media-discovery-subtabs.png"),
      fullPage: false,
    });
  }

  console.log("Capturing /media/targets grid...");
  await page.goto(`${BASE}/media/targets`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(OUT, "media-targets-grid.png"),
    fullPage: true,
  });

  console.log("Clicking fandom card → /media?target=fandom");
  await page.goto(`${BASE}/media/targets`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.getByText("팬덤/엔터").click();
  await page.waitForURL(/target=fandom/, { timeout: 15000 });
  await page.waitForTimeout(2000);
  const fandomChip = page.getByRole("button", { name: /팬덤/ }).first();
  const chipActive = await fandomChip.evaluate((el) =>
    el.className.includes("bg-pink-500"),
  );
  await page.screenshot({
    path: path.join(OUT, "media-target-fandom-filter.png"),
    fullPage: false,
  });
  console.log("Fandom chip active:", chipActive);

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
