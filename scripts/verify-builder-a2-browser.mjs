#!/usr/bin/env node
/**
 * A-2 browser verification — KPI label override + hide toggle.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-builder-a2-browser.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  clickSaveAndWaitForReportId,
  goToPreview,
} from "./builder-browser-helpers.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/builder-a2-browser-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const CUSTOM_KPI_LABEL = "브라우저 A2 커스텀 KPI 라벨";
const CUSTOM_DISCLAIMER = "브라우저 A2 disclaimer 회귀";

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
    throw new Error(`admin login failed: ${res.status()} ${await res.text()}`);
  }
}

async function setupProposalReport(page) {
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]', {
    timeout: 120_000,
  });
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("A2 proposal");
  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
}

async function saveAndPreview(page) {
  const save = await clickSaveAndWaitForReportId(page);
  if (!save.ok) {
    throw new Error(
      `save failed: status=${save.api.status} body=${save.api.body?.slice(0, 300)}`,
    );
  }
  await goToPreview(page, BASE, save.reportId);
  return save.reportId;
}

async function pptxXml(pptxPath) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await readFile(pptxPath));
  return Promise.all(
    Object.keys(zip.files)
      .filter((n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"))
      .map((n) => zip.file(n).async("string")),
  );
}

async function main() {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD required");
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    acceptDownloads: true,
  });
  await loginViaApi(context);
  const page = await context.newPage();
  const results = [];

  // --- Proposal: label override ---
  await setupProposalReport(page);
  const totalBudgetRow = page.getByTestId("builder-kpi-card-totalBudget");
  await totalBudgetRow.locator('input[type="text"]').fill(CUSTOM_KPI_LABEL);
  const valueBeforeHide = await totalBudgetRow.locator(".tabular-nums").innerText();

  const disclaimerField = page
    .getByText("Disclaimer", { exact: false })
    .locator("xpath=following::textarea[1]");
  await disclaimerField.fill(CUSTOM_DISCLAIMER);

  await saveAndPreview(page);
  let previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "proposal preview custom KPI label",
    ok: previewText.includes(CUSTOM_KPI_LABEL),
    detail: CUSTOM_KPI_LABEL,
  });
  const valueToken = valueBeforeHide.replace(/[^\d만원]/g, "");
  results.push({
    step: "proposal preview KPI value unchanged",
    ok: previewText.replace(/\s+/g, "").includes(valueToken),
    detail: valueToken,
  });
  results.push({
    step: "A-1 disclaimer regression proposal",
    ok: previewText.includes(CUSTOM_DISCLAIMER),
  });

  const [pptx1] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath1 = path.join(OUT, "proposal.pptx");
  await pptx1.saveAs(pptxPath1);
  const pptx1Xml = (await pptxXml(pptxPath1)).join("\n");
  results.push({
    step: "proposal PPTX custom KPI label",
    ok: pptx1Xml.includes(CUSTOM_KPI_LABEL),
  });

  // --- Proposal: hide one KPI ---
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]');
  await setupProposalReport(page);
  await page.getByTestId("builder-kpi-card-avgBudget")
    .locator('label:has-text("노출") input[type="checkbox"]').uncheck();
  await saveAndPreview(page);
  previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "proposal hide expectedReach in preview",
    ok: !previewText.includes("평균 채널 예산"),
  });

  const [pptx2] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath2 = path.join(OUT, "proposal-hidden.pptx");
  await pptx2.saveAs(pptxPath2);
  const pptx2Xml = (await pptxXml(pptxPath2)).join("\n");
  results.push({
    step: "proposal PPTX hide expectedReach",
    ok: !pptx2Xml.includes("평균 채널 예산"),
  });

  // --- Report mode ---
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]');
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("A2 report");
  await page.getByRole("button", { name: "리포트", exact: true }).click();
  const customSection = page.locator("section").filter({ hasText: /실제 집행|커스텀/i }).first();
  await customSection.locator('label:text("매체명") input').fill("실측 A2");
  await customSection.locator('label:text("시작일") input').fill("2026-01-01");
  await customSection.locator('label:text("종료일") input').fill("2026-01-31");
  await customSection.locator('label:text("집행 예산") input').fill("3000000");
  await customSection.locator('label:text("실측 도달") input').fill("50000");
  await customSection.getByRole("button", { name: /추가|add/i }).click();
  await page.getByTestId("builder-kpi-card-actualReach")
    .locator('input[type="text"]').fill("A2 실측 도달 커스텀");
  await saveAndPreview(page);
  previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "report preview custom KPI label",
    ok: previewText.includes("A2 실측 도달 커스텀"),
  });
  results.push({
    step: "report preview value still 50,000",
    ok: previewText.includes("50,000"),
  });

  await writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
