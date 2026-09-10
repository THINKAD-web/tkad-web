#!/usr/bin/env node
/**
 * A-1 browser verification — override fields + report KPI + PPTX export.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-builder-a1-browser.mjs
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
const OUT = path.join(process.cwd(), "tmp/builder-a1-browser-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const CUSTOM_DISCLAIMER = "브라우저 A1 disclaimer 테스트";
const CUSTOM_DIGITAL = "브라우저 A1 디지털 제목";

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

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]', {
    timeout: 120_000,
  });
  results.push({ step: "load builder step2", ok: true });

  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("A1 브라우저 검증");

  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
  results.push({ step: "add digital line", ok: true });

  const reportBtn = page.getByRole("button", { name: "리포트", exact: true });
  if (await reportBtn.count()) {
    await reportBtn.click();
    results.push({ step: "switch report mode", ok: true });
  }

  // Add custom line for report KPI (optional — panel label varies)
  const customSection = page.locator("section").filter({ hasText: /실제 집행|커스텀|custom/i }).first();
  if (await customSection.count()) {
    await customSection.locator('label:text("매체명") input').fill("실측 캠페인 A1");
    await customSection.locator('label:text("시작일") input').fill("2026-01-01");
    await customSection.locator('label:text("종료일") input').fill("2026-01-31");
    await customSection.locator('label:text("집행 예산") input').fill("3000000");
    await customSection.locator('label:text("실측 도달") input').fill("50000");
    await customSection.locator('label:text("실측 클릭") input').fill("900");
    await customSection.getByRole("button", { name: /추가|add/i }).click();
    results.push({ step: "add custom line", ok: true });
  } else {
    results.push({ step: "add custom line", ok: false, detail: "section not found" });
  }

  const disclaimerField = page
    .locator("section")
    .filter({ hasText: "운영 인사이트" })
    .locator('textarea')
    .filter({ hasText: /면책|catalog|카탈로그|THINKAD/i })
    .first();
  const disclaimerByLabel = page
    .getByText("Disclaimer", { exact: false })
    .locator("xpath=following::textarea[1]");
  if (await disclaimerByLabel.count()) {
    await disclaimerByLabel.fill(CUSTOM_DISCLAIMER);
    results.push({ step: "edit disclaimer", ok: true });
  } else if (await disclaimerField.count()) {
    await disclaimerField.fill(CUSTOM_DISCLAIMER);
    results.push({ step: "edit disclaimer", ok: true });
  } else {
    const allTextareas = page.locator('section:has-text("운영 인사이트") textarea');
    const count = await allTextareas.count();
    if (count >= 4) {
      await allTextareas.nth(3).fill(CUSTOM_DISCLAIMER);
      results.push({ step: "edit disclaimer", ok: true, detail: "via nth(3)" });
    } else {
      results.push({ step: "edit disclaimer", ok: false, detail: `textarea count=${count}` });
    }
  }

  const digitalTitleField = page
    .getByText("디지털 섹션 제목")
    .locator("xpath=following::input[1]");
  await digitalTitleField.fill(CUSTOM_DIGITAL);
  results.push({ step: "edit digital section title", ok: true });

  const save = await clickSaveAndWaitForReportId(page);
  results.push({
    step: "save report",
    ok: save.ok,
    detail: save.reportId ?? "no id",
    apiStatus: save.api.status,
    apiError: save.api.error ?? undefined,
    apiBody: save.api.body?.slice(0, 500) || undefined,
    urlId: save.urlId ?? undefined,
    uiId: save.uiId ?? undefined,
  });

  await goToPreview(page, BASE, save.reportId);

  const previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "preview custom digital title",
    ok: previewText.includes(CUSTOM_DIGITAL),
    detail: previewText.includes(CUSTOM_DIGITAL) ? CUSTOM_DIGITAL : "missing",
  });
  results.push({
    step: "preview custom disclaimer",
    ok: previewText.includes(CUSTOM_DISCLAIMER),
    detail: previewText.includes(CUSTOM_DISCLAIMER) ? CUSTOM_DISCLAIMER : "missing",
  });
  results.push({
    step: "report KPI labels in preview",
    ok:
      previewText.includes("실측 도달") ||
      previewText.includes("집행 캠페인") ||
      previewText.includes("실측 클릭"),
    detail: previewText.match(/집행 캠페인|실측 도달|실측 클릭/g)?.join(", ") ?? "none",
  });

  await page.screenshot({ path: path.join(OUT, "a1-preview.png"), fullPage: true });

  const [pdfDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "a1-export.pdf");
  await pdfDownload.saveAs(pdfPath);
  const pdfBuf = await readFile(pdfPath);
  results.push({
    step: "PDF export download",
    ok: pdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF") && pdfBuf.length > 5000,
    detail: `size=${pdfBuf.length}`,
  });

  const [pptxDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "a1-export.pptx");
  await pptxDownload.saveAs(pptxPath);

  const { default: JSZip } = await import("jszip");
  const pptxBuf = await readFile(pptxPath);
  const zip = await JSZip.loadAsync(pptxBuf);
  const slideXml = await Promise.all(
    Object.keys(zip.files)
      .filter((n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"))
      .map((n) => zip.file(n).async("string")),
  );
  const joined = slideXml.join("\n");
  results.push({
    step: "PPTX single cover",
    ok: !joined.includes("CAMPAIGN PLANNER") && joined.includes("CAMPAIGN BUILDER"),
  });
  results.push({
    step: "PPTX custom digital title",
    ok: joined.includes(CUSTOM_DIGITAL),
    detail: CUSTOM_DIGITAL,
  });
  results.push({
    step: "PPTX custom disclaimer on insights slide",
    ok: joined.includes(CUSTOM_DISCLAIMER),
    detail: CUSTOM_DISCLAIMER,
  });

  await writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await mkdir(OUT, { recursive: true }).catch(() => {});
  await writeFile(path.join(OUT, "error.txt"), String(err)).catch(() => {});
  process.exit(1);
});
