/**
 * PR4 baseline — admin medias list + edit modal screenshots.
 * Usage: SCREENSHOT_BASE=https://tkad.co.kr node scripts/capture-pr4-baseline-admin.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = process.argv.includes("--output")
  ? path.resolve(process.argv[process.argv.indexOf("--output") + 1])
  : path.join(process.cwd(), "docs/screenshots/pr4-baseline");
const VERCEL_SHARE =
  (process.argv.includes("--share")
    ? process.argv[process.argv.indexOf("--share") + 1]
    : process.env.VERCEL_SHARE_TOKEN) ?? "";
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  "thinkad2024"
).trim().replace(/\\n$/, "");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function loginViaApi(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    data: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`admin login failed: ${res.status()} ${body}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
  });
  const page = await context.newPage();

  try {
    if (VERCEL_SHARE) {
      await page.goto(`${BASE}/?_vercel_share=${VERCEL_SHARE}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(1000);
    }
    await loginViaApi(context);

    await page.goto(`${BASE}/ko/admin/medias`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(OUT, "01-admin-medias-list.png"),
      fullPage: false,
    });

    const editBtn = page.getByRole("button", { name: "수정" }).first();
    await editBtn.waitFor({ state: "visible", timeout: 30000 });
    await editBtn.click();
    await page.getByText("매체 수정").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(800);

    const modal = page
      .locator("div.fixed.inset-0")
      .filter({ has: page.getByText("매체 수정") })
      .locator("div.max-w-3xl")
      .first();
    const scrollBody = modal.locator('[class*="overflow-y-auto"]').first();

    await scrollBody.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(300);
    await modal.screenshot({
      path: path.join(OUT, "02-admin-medias-edit-full.png"),
    });

    const legacyHeader = scrollBody.getByText("선택 정보", { exact: true });
    await legacyHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await modal.screenshot({
      path: path.join(OUT, "03-admin-medias-edit-legacy-fields-zoom.png"),
    });

    console.log("Saved PR4 baseline screenshots to", OUT);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
