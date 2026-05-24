import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".screenshots";

const pages = [
  { url: "/ko", file: "mobile-home.png" },
  { url: "/ko/my", file: "mobile-my.png" },
  { url: "/ko/media", file: "mobile-media.png" },
  { url: "/ko/media", file: "mobile-tab-bar.png", clipBottom: true },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
});

for (const pageDef of pages) {
  const page = await context.newPage();
  await page.goto(`${BASE}${pageDef.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);

  if (pageDef.clipBottom) {
    await page.screenshot({
      path: `${OUT}/${pageDef.file}`,
      clip: { x: 0, y: 680, width: 375, height: 132 },
    });
  } else {
    await page.screenshot({ path: `${OUT}/${pageDef.file}`, fullPage: false });
  }
  await page.close();
  console.log(`Saved ${OUT}/${pageDef.file}`);
}

await browser.close();
