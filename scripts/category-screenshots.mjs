import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = ".screenshots/categories";

const pages = [
  { url: "/ko/media/category/subway", file: "category-subway.png", fullPage: true },
  { url: "/ko/target/fandom", file: "target-fandom.png", fullPage: true },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const pageDef of pages) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${pageDef.url}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${OUT}/${pageDef.file}`,
    fullPage: pageDef.fullPage ?? false,
  });
  console.log(`Saved ${OUT}/${pageDef.file}`);
  await context.close();
}

// Home category section
{
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/ko`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);
  const heading = page.getByText("목적별로", { exact: false });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/home-category-section.png`,
    clip: { x: 0, y: 280, width: 1280, height: 520 },
  });
  console.log(`Saved ${OUT}/home-category-section.png`);
  await context.close();
}

// Admin media form (login first)
{
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/ko/admin/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.fill('input[type="email"], input[name="email"], input[autocomplete="username"]', "admin@tkad.co.kr");
  await page.fill('input[type="password"]', "admin1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 30000 });
  await page.goto(`${BASE}/ko/admin/medias/new`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(2500);
  const categoryBlock = page.getByText("매체 카테고리");
  if (await categoryBlock.count()) {
    await categoryBlock.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
  await page.screenshot({
    path: `${OUT}/admin-media-category-fields.png`,
    fullPage: false,
  });
  console.log(`Saved ${OUT}/admin-media-category-fields.png`);
  await context.close();
}

await browser.close();
