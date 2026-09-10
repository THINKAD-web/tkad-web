#!/usr/bin/env node
/**
 * Preview Bunny upload E2E — cover logo full path (no PATCH fallback).
 * Usage: BASE=https://...preview... node scripts/verify-builder-b-preview-bunny.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  clickSaveAndWaitForReportId,
  goToPreview,
  waitForBuilderReady,
} from "./builder-browser-helpers.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/builder-b-preview-bunny");
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    data: { username: "admin", password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
}

async function pptxHasImage(pptxPath) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await readFile(pptxPath));
  const xml = await Promise.all(
    Object.keys(zip.files)
      .filter((n) => n.startsWith("ppt/slides/slide1") && n.endsWith(".xml"))
      .map((n) => zip.file(n).async("string")),
  );
  return xml.join("\n").includes("<p:pic") || xml.join("\n").includes("pic:blipFill");
}

async function main() {
  if (!BASE) throw new Error("BASE required");
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD required");
  await mkdir(OUT, { recursive: true });

  const logoPath = path.join(OUT, "logo-red.png");
  await writeFile(logoPath, TINY_PNG);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    acceptDownloads: true,
  });
  await login(context);
  const page = await context.newPage();
  const report = { steps: [] };

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await waitForBuilderReady(page);
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("B Bunny preview verify");
  await page
    .locator("section")
    .filter({ hasText: "디지털 채널" })
    .first()
    .getByRole("button", { name: "추가" })
    .first()
    .click();

  // Step 1–2: upload via UI
  let uploadResponse = null;
  page.on("response", (res) => {
    if (
      res.request().method() === "POST" &&
      res.url().includes("/api/planner/creative/upload")
    ) {
      uploadResponse = res;
    }
  });
  await page.getByTestId("builder-cover-logo-input").setInputFiles(logoPath);
  await page.waitForSelector('[data-testid="builder-cover-logo-thumb"]', {
    timeout: 60_000,
  });
  const cdnUrl = await page.getByTestId("builder-cover-logo-thumb").getAttribute("src");
  let uploadJson = null;
  if (uploadResponse) {
    try {
      uploadJson = await uploadResponse.json();
    } catch {
      uploadJson = null;
    }
  }
  const secureUrl = uploadJson?.secureUrl ?? cdnUrl;
  report.steps.push({
    step: "1 upload button selects file and completes",
    ok: Boolean(cdnUrl),
    detail: { uiThumbSrc: cdnUrl, uploadStatus: uploadResponse?.status() ?? null },
  });

  let cdnFetchOk = false;
  let cdnContentType = "";
  if (secureUrl) {
    const head = await context.request.get(secureUrl);
    cdnFetchOk = head.ok();
    cdnContentType = head.headers()["content-type"] ?? "";
  }
  report.steps.push({
    step: "2 Bunny CDN secureUrl returned and URL is accessible",
    ok: Boolean(secureUrl?.startsWith("http")) && cdnFetchOk,
    detail: { secureUrl, uploadStatus: uploadResponse?.status(), cdnContentType },
  });

  const save = await clickSaveAndWaitForReportId(page);
  const getAfterSave = await context.request.get(
    `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
    { credentials: "include" },
  );
  const storedPayload = (await getAfterSave.json()).payload;
  report.steps.push({
    step: "3 payload.coverLogoUrl persisted on save",
    ok: storedPayload?.coverLogoUrl === secureUrl,
    detail: storedPayload?.coverLogoUrl,
  });

  await page.goto(
    `${BASE}/ko/admin/reports?type=builder&step=3&id=${encodeURIComponent(save.reportId)}`,
    { waitUntil: "networkidle", timeout: 120_000 },
  );
  await waitForBuilderReady(page, { timeoutMs: 120_000 });
  await page.waitForSelector('[data-testid="campaign-builder-report-preview"]', {
    timeout: 120_000,
  });
  const previewSrc = await page
    .getByTestId("campaign-builder-report-preview")
    .locator("img")
    .first()
    .getAttribute("src");
  report.steps.push({
    step: "4 preview shows uploaded image",
    ok: previewSrc === secureUrl,
    detail: previewSrc,
  });

  const [pdfDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "cover.pdf");
  await pdfDl.saveAs(pdfPath);
  const pdfBuf = await readFile(pdfPath);
  report.steps.push({
    step: "5a PDF export downloaded (embed attempted)",
    ok: pdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF") && pdfBuf.length > 5000,
    detail: `size=${pdfBuf.length}`,
  });

  const [pptxDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "cover.pptx");
  await pptxDl.saveAs(pptxPath);
  report.steps.push({
    step: "5b PPTX export has cover image embed",
    ok: await pptxHasImage(pptxPath),
  });

  // Step 6: invalid format + oversize
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2&id=${save.reportId}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForBuilderReady(page);

  const badTxt = path.join(OUT, "bad.txt");
  await writeFile(badTxt, "not an image");
  await page.getByTestId("builder-cover-logo-input").setInputFiles(badTxt);
  await page.waitForTimeout(1500);
  const errAfterBadType = await page
    .locator('[data-testid="campaign-builder-track"]')
    .locator(".text-destructive")
    .textContent()
    .catch(() => "");
  report.steps.push({
    step: "6a invalid format shows user error",
    ok: Boolean(errAfterBadType?.includes("실패") || errAfterBadType?.includes("failed")),
    detail: errAfterBadType?.trim(),
  });

  const bigPath = path.join(OUT, "big.png");
  await writeFile(bigPath, Buffer.alloc(6 * 1024 * 1024, 0));
  await page.getByTestId("builder-cover-logo-input").setInputFiles(bigPath);
  await page.waitForTimeout(1500);
  const errAfterBig = await page
    .locator('[data-testid="campaign-builder-track"]')
    .locator(".text-destructive")
    .textContent()
    .catch(() => "");
  report.steps.push({
    step: "6b oversize file shows user error",
    ok: Boolean(errAfterBig?.includes("실패") || errAfterBig?.includes("failed")),
    detail: errAfterBig?.trim(),
  });

  await context.request.delete(
    `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
  );
  await unlink(badTxt).catch(() => {});
  await unlink(bigPath).catch(() => {});

  report.cdnUrl = secureUrl;
  report.allOk = report.steps.every((s) => s.ok);
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
