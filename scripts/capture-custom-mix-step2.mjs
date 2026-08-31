#!/usr/bin/env node
/**
 * Step 2 커스텀 mix UI 스크린샷 (dev/preview 서버 필요).
 *
 * Usage:
 *   SCREENSHOT_BASE=http://127.0.0.1:3000 node scripts/capture-custom-mix-step2.mjs
 *   SCREENSHOT_BASE=https://preview-url.vercel.app node scripts/capture-custom-mix-step2.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "screenshots", "custom-mix-step2");

const briefSeed = {
  state: {
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    regionCodes: [],
    genders: [],
    ageBands: [],
    goal: "awareness",
    industry: null,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-30",
    freeText: "",
    wizardStep: 2,
    entryMode: "detailed",
    channelMode: "ooh_only",
    digitalBudgetPct: 30,
    digitalChannelIds: ["youtube", "instagram", "naver"],
    mixUnits: {},
    customLines: [],
    mixBriefFingerprint: null,
    budgetWithinOnly: true,
  },
  version: 0,
};

async function dismissDialogs(page) {
  for (const label of [/이어서 진행|Continue/i, /유지|Keep mix/i, /닫기|Close/i]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 960 },
  });

  await page.addInitScript((brief) => {
    localStorage.setItem("tkad-planner-brief-v1", JSON.stringify(brief));
  }, briefSeed);

  await page.goto(`${BASE}/ko/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(4000);
  await dismissDialogs(page);

  await page.waitForSelector('[data-testid="brief-mix-card-row"]', {
    timeout: 60_000,
  });

  const firstAdd = page
    .locator('[data-testid="brief-mix-card-row"]')
    .first()
    .getByRole("button", { name: /추가|Add/i });
  await firstAdd.click();
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(OUT, "01-catalog-added.png"),
    fullPage: true,
  });

  await page.getByTestId("brief-custom-line-add-open").click();
  await page.getByTestId("brief-custom-line-name").fill("특수 협의 매체");
  await page.getByTestId("brief-custom-line-quantity").fill("2");
  await page.getByTestId("brief-custom-line-unit-price").fill("1500000");
  await page.getByTestId("brief-custom-line-notes").fill("일회성 계약");
  await page.getByTestId("brief-custom-line-submit").click();
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(OUT, "02-mixed-with-custom.png"),
    fullPage: true,
  });

  const mixList = page.getByTestId("brief-mix-list");
  await mixList.screenshot({
    path: path.join(OUT, "03-mix-list-panel.png"),
  });

  const metrics = page.locator("aside").filter({ hasText: /실시간 지표|Live metrics/ });
  await metrics.first().screenshot({
    path: path.join(OUT, "04-metrics-panel.png"),
  });

  await dismissDialogs(page);

  await page.getByTestId("brief-custom-line-edit").click({ force: true });
  await page.getByTestId("brief-custom-line-quantity").fill("3");
  await page.getByTestId("brief-custom-line-submit").click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUT, "05-after-edit-quantity.png"),
    fullPage: true,
  });

  await page.getByTestId("brief-custom-line-remove").click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUT, "06-after-remove-custom.png"),
    fullPage: true,
  });

  console.log(`Screenshots saved to ${OUT}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
