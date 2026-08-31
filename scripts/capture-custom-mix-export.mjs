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
    wizardStep: 2,
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
  const page = await browser.newPage({ viewport: { width: 1400, height: 960 } });

  await page.route("**/api/report-access**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ allowed: true, tier: "pro", reason: "qa_mock" }),
    });
  });

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
  });

  const firstAdd = page
    .locator('[data-testid="brief-mix-card-row"]')
    .first()
    .getByRole("button", { name: /추가|Add/i });
  await firstAdd.click();
  await page.waitForTimeout(800);
  await dismissDialogs(page);

  await page.screenshot({
    path: path.join(OUT, "01-step2-mixed.png"),
    fullPage: true,
  });

  await dismissDialogs(page);

  const nextBtn = page.getByTestId("brief-step-two-next");
  await nextBtn.scrollIntoViewIfNeeded();
  await nextBtn.click({ force: true });
  await page.waitForTimeout(4000);
  await dismissDialogs(page);

  await page.getByText(/확정 믹스|Confirmed mix/).waitFor({
    state: "visible",
    timeout: 60_000,
  });

  await page.screenshot({
    path: path.join(OUT, "02-step3-mixed.png"),
    fullPage: true,
  });

  const customRow = page.getByTestId("brief-step-three-custom-row");
  if (await customRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    await customRow.screenshot({ path: path.join(OUT, "04-custom-row.png") });
  }

  const quote = page.getByTestId("report-quote-summary");
  await page.getByText(/제안서 미리보기|Proposal preview/).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  if (await quote.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await quote.screenshot({ path: path.join(OUT, "03-quote-summary.png") });
  }

  const preview = page.locator('[data-testid="report-quote-summary"]').locator("..").locator("..");
  if (await preview.count()) {
    await page.locator(".document-preview-frame, [class*='DocumentPreview']").first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUT, "05-proposal-preview.png"),
      fullPage: false,
    }).catch(() => {});
  }

  const pdfBtn = page.getByRole("button", { name: /제안서 PDF 생성|Generate proposal PDF/i });
  if (await pdfBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const exportResponse = page.waitForResponse(
      (res) => res.url().includes("/api/planner/report/export"),
      { timeout: 120_000 },
    );
    await pdfBtn.click();
    const response = await exportResponse.catch(() => null);
    if (response?.ok()) {
      const pdfPath = path.join(OUT, "export-mixed.pdf");
      await writeFile(pdfPath, await response.body());
      console.log("Saved:", pdfPath);
    } else {
      console.warn(
        "PDF export API requires authenticated PRO — see custom-mix-export.test.ts smoke",
      );
    }
  } else {
    console.warn("PDF button not visible — preview may still be gated");
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
