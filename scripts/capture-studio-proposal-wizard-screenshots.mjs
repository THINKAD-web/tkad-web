#!/usr/bin/env node
/**
 * Studio proposal wizard — Step 1 (type) + Step 2 (details) screenshots.
 *
 * Requires LITE+ session on /ko/studio/proposal (same PRO gate as production).
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3099 \
 *   QA_SEED_EMAIL=... QA_SEED_PASSWORD=... \
 *   node scripts/capture-studio-proposal-wizard-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), ".compare-screenshots");
const EMAIL = process.env.QA_SEED_EMAIL ?? process.env.QA_EMAIL;
const PASSWORD = process.env.QA_SEED_PASSWORD ?? process.env.QA_PASSWORD;

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function loginViaApi(request) {
  if (!EMAIL || !PASSWORD) return false;
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  return res.ok();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  const loggedIn = await loginViaApi(context.request);
  console.log(loggedIn ? `logged in as ${EMAIL}` : "no QA credentials — expect PRO gate");

  await page.goto(`${BASE}/ko/studio/proposal`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(loggedIn ? 2500 : 1500);

  const gate = page.getByText(/PRO 전용 기능입니다|PRO members only/i);
  if (await gate.count()) {
    await page.screenshot({
      path: path.join(OUT, "studio-proposal-gated.png"),
      fullPage: true,
    });
    console.warn("wizard gated — set QA_SEED_EMAIL / QA_SEED_PASSWORD (LITE+ account)");
    await browser.close();
    process.exit(loggedIn ? 1 : 0);
  }

  await page.waitForSelector("h2:has-text('제안서 유형 선택')", { timeout: 120000 });
  await page.locator("h2:has-text('제안서 유형 선택')").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "studio-proposal-wizard-step1.png"),
    fullPage: true,
  });
  console.log("saved studio-proposal-wizard-step1.png");

  await page.locator("button", { hasText: /^다음$/ }).last().click();
  await page.waitForSelector("h2:has-text('정보 입력')", { timeout: 15000 });
  await page.locator("h2:has-text('정보 입력')").scrollIntoViewIfNeeded();
  await page.waitForSelector("text=브랜드/주체", { timeout: 5000 });
  await page.screenshot({
    path: path.join(OUT, "studio-proposal-wizard-step2.png"),
    fullPage: true,
  });
  console.log("saved studio-proposal-wizard-step2.png");

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
