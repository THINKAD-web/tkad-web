#!/usr/bin/env node
/**
 * Step 3 — catalog + custom mix PDF/PPTX export QA.
 *
 * Usage:
 *   SCREENSHOT_BASE=http://127.0.0.1:3000 node scripts/capture-custom-mix-export.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "screenshots", "custom-mix-export");

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
    wizardStep: 3,
    entryMode: "detailed",
    channelMode: "ooh_only",
    digitalBudgetPct: 30,
    digitalChannelIds: ["youtube", "instagram", "naver"],
    mixUnits: {},
    customLines: [
      {
        lineId: "custom-export-qa",
        name: "특수 협의 매체",
        quantity: 2,
        unitPriceWon: 1_500_000,
        notes: "일회성 계약",
      },
    ],
    mixBriefFingerprint: null,
    budgetWithinOnly: true,
  },
  version: 0,
};

async function dismissDialogs(page) {
  for (const label of [/이어서 진행|Continue/i, /유지|Keep mix/i]) {
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
  const page = await browser.newPage({ viewport: { width: 1400, height: 960 } });

  await page.addInitScript((brief) => {
    localStorage.setItem("tkad-planner-brief-v1", JSON.stringify(brief));
  }, briefSeed);

  await page.goto(`${BASE}/ko/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(5000);
  await dismissDialogs(page);

  await page.waitForSelector('[data-testid="brief-mix-card-row"]', {
    timeout: 60_000,
  }).catch(() => {});

  if (briefSeed.state.mixUnits && Object.keys(briefSeed.state.mixUnits).length === 0) {
    const addBtn = page
      .locator('[data-testid="brief-mix-card-row"]')
      .first()
      .getByRole("button", { name: /추가|Add/i });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await dismissDialogs(page);
    }
  }

  await page.getByTestId("brief-step-two-next").click({ force: true }).catch(async () => {
    await page.getByRole("button", { name: /결과 보기|See result/i }).click({ force: true });
  });
  await page.waitForTimeout(3000);
  await dismissDialogs(page);

  await page.screenshot({
    path: path.join(OUT, "01-step3-mixed.png"),
    fullPage: true,
  });

  const quote = page.getByTestId("report-quote-summary");
  if (await quote.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await quote.screenshot({ path: path.join(OUT, "02-quote-summary.png") });
  }

  const pdfBtn = page.getByRole("button", { name: /PDF/i }).first();
  if (await pdfBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 120_000 }),
      pdfBtn.click(),
    ]);
    const pdfPath = path.join(OUT, "export-mixed.pdf");
    await download.saveAs(pdfPath);
    console.log("Saved PDF:", pdfPath);
  }

  await browser.close();
  await writeFile(
    path.join(OUT, "README.txt"),
    `Captured at ${new Date().toISOString()} from ${BASE}\n`,
  );
  console.log(`Export QA artifacts: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
