import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".screenshots/mobile-ux";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

const shots = [
  {
    name: "mobile-home-full.png",
    url: "/ko",
    viewport: { width: 375, height: 812 },
    fullPage: true,
  },
  {
    name: "desktop-home-full.png",
    url: "/ko",
    viewport: { width: 1440, height: 900 },
    fullPage: true,
  },
  {
    name: "category-grid-home.png",
    url: "/ko",
    viewport: { width: 375, height: 812 },
    fullPage: false,
    scrollTo: '[class*="grid-cols-4"]',
  },
  {
    name: "category-grid-media-browse.png",
    url: "/ko/media",
    viewport: { width: 375, height: 812 },
    fullPage: false,
    scrollTo: '[class*="grid-cols-4"]',
  },
];

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${shot.url}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(3500);

  if (shot.scrollTo) {
    const el = page.locator(shot.scrollTo).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({
    path: `${OUT}/${shot.name}`,
    fullPage: shot.fullPage ?? false,
  });
  console.log(`Saved ${OUT}/${shot.name}`);
  await context.close();
}

await browser.close();
