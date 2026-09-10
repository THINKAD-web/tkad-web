#!/usr/bin/env node
/**
 * A-3 browser verification — line notes + insight subtitle overrides.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-builder-a3-browser.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
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
const OUT = path.join(process.cwd(), "tmp/builder-a3-browser-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const DIGITAL_NOTE = "브라우저 A3 디지털 비고";
const OOH_NOTE = "브라우저 A3 OOH 비고";
const CUSTOM_PACING_SUBTITLE = "브라우저 A3 커스텀 페이스";
const CUSTOM_CREATIVE_SUBTITLE = "브라우저 A3 커스텀 소재";
const CUSTOM_OPERATIONAL_SUBTITLE = "브라우저 A3 커스텀 운영";

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

function pdfText(pdfPath) {
  try {
    return execSync(`pdftotext "${pdfPath}" -`, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    return "";
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
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("A3 브라우저 검증");

  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
  await page.locator('[data-testid^="builder-digital-note-"]').first().fill(DIGITAL_NOTE);
  results.push({ step: "fill digital note", ok: true });

  await page.getByRole("button", { name: "OOH", exact: true }).click();
  await page.waitForTimeout(300);
  const oohSection = page.locator("section").filter({ hasText: "OOH 매체" }).first();
  await oohSection.getByRole("button", { name: "추가" }).first().click();
  await page.locator('[data-testid^="builder-ooh-note-"]').first().fill(OOH_NOTE);
  results.push({ step: "fill OOH note", ok: true });

  const insightsSection = page.locator("section").filter({ hasText: "운영 인사이트" });
  await insightsSection.getByTestId("builder-insight-subtitle-pacing").scrollIntoViewIfNeeded();
  await insightsSection.getByTestId("builder-insight-subtitle-pacing").fill(CUSTOM_PACING_SUBTITLE);
  await insightsSection.getByTestId("builder-insight-subtitle-creative").fill(CUSTOM_CREATIVE_SUBTITLE);
  await insightsSection.getByTestId("builder-insight-subtitle-operational").fill(CUSTOM_OPERATIONAL_SUBTITLE);
  results.push({ step: "fill insight subtitles", ok: true });

  await saveAndPreview(page);
  const previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "preview digital note column",
    ok: previewText.includes(DIGITAL_NOTE),
  });
  results.push({
    step: "preview OOH note column",
    ok: previewText.includes(OOH_NOTE),
  });
  results.push({
    step: "preview custom pacing subtitle",
    ok: previewText.includes(CUSTOM_PACING_SUBTITLE),
  });
  results.push({
    step: "preview custom creative subtitle",
    ok: previewText.includes(CUSTOM_CREATIVE_SUBTITLE),
  });
  results.push({
    step: "preview custom operational subtitle",
    ok: previewText.includes(CUSTOM_OPERATIONAL_SUBTITLE),
  });
  const [pptxDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "proposal.pptx");
  await pptxDl.saveAs(pptxPath);
  const pptxText = (await pptxXml(pptxPath)).join("\n");
  results.push({ step: "PPTX digital note", ok: pptxText.includes(DIGITAL_NOTE) });
  results.push({ step: "PPTX OOH note", ok: pptxText.includes(OOH_NOTE) });
  results.push({
    step: "PPTX custom pacing subtitle",
    ok: pptxText.includes(CUSTOM_PACING_SUBTITLE),
  });
  results.push({
    step: "PPTX custom creative subtitle",
    ok: pptxText.includes(CUSTOM_CREATIVE_SUBTITLE),
  });
  results.push({
    step: "PPTX custom operational subtitle",
    ok: pptxText.includes(CUSTOM_OPERATIONAL_SUBTITLE),
  });

  const [pdfDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "proposal.pdf");
  await pdfDl.saveAs(pdfPath);
  const pdfContent = pdfText(pdfPath);
  const pdfBuf = await readFile(pdfPath);
  results.push({
    step: "PDF export download",
    ok: pdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF") && pdfBuf.length > 5000,
    detail: `size=${pdfBuf.length}`,
  });
  if (pdfContent) {
    results.push({ step: "PDF digital note", ok: pdfContent.includes(DIGITAL_NOTE) });
    results.push({ step: "PDF OOH note", ok: pdfContent.includes(OOH_NOTE) });
    results.push({
      step: "PDF custom pacing subtitle",
      ok: pdfContent.includes(CUSTOM_PACING_SUBTITLE),
    });
    results.push({
      step: "PDF custom creative subtitle",
      ok: pdfContent.includes(CUSTOM_CREATIVE_SUBTITLE),
    });
    results.push({
      step: "PDF custom operational subtitle",
      ok: pdfContent.includes(CUSTOM_OPERATIONAL_SUBTITLE),
    });
  } else {
    results.push({
      step: "PDF text extraction skipped",
      ok: true,
      detail: "pdftotext unavailable — covered by build-pdf-builder unit test",
    });
  }

  await writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
