import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".screenshots/desktop";

const pages = [
  { url: "/ko", file: "pc-home.png", width: 1440, height: 900 },
  { url: "/ko/media", file: "pc-media.png", width: 1440, height: 900 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const pageDef of pages) {
  const page = await context.newPage();
  await page.setViewportSize({ width: pageDef.width, height: pageDef.height });
  await page.goto(`${BASE}${pageDef.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/${pageDef.file}`, fullPage: false });
  console.log(`Saved ${OUT}/${pageDef.file}`);
  await page.close();
}

// 더보기 드롭다운
{
  const page = await context.newPage();
  await page.goto(`${BASE}/ko`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  const moreBtn = page.getByRole("button", { name: /더보기/ });
  if (await moreBtn.count()) {
    await moreBtn.first().hover();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: `${OUT}/pc-more-dropdown.png`, fullPage: false });
  console.log(`Saved ${OUT}/pc-more-dropdown.png`);
  await page.close();
}

// Cmd+K 팔레트
{
  const page = await context.newPage();
  await page.goto(`${BASE}/ko/media`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/pc-command-palette.png`, fullPage: false });
  console.log(`Saved ${OUT}/pc-command-palette.png`);
  await page.close();
}

await browser.close();
