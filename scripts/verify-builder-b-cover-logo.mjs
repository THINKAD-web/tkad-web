#!/usr/bin/env node
/**
 * B — cover logo upload, reopen persistence, PDF/PPTX export, remove + regression.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-builder-b-cover-logo.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  clickSaveAndWaitForReportId,
  goToPreview,
  waitForBuilderReady,
} from "./builder-browser-helpers.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/builder-b-cover-logo-verify");
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

/** 1×1 PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
/** Fallback when local Bunny env is empty — server + export can still fetch this URL. */
const FALLBACK_LOGO_URL = "https://tkad.co.kr/favicon.ico";

async function login(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    data: { username: "admin", password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
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
  const logoPath = path.join(OUT, "logo.png");
  await writeFile(logoPath, TINY_PNG);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    acceptDownloads: true,
  });
  await login(context);
  const page = await context.newPage();
  const consoleErrors = [];
  let bunnyUploadUnavailable = false;
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("503")) {
      bunnyUploadUnavailable = true;
      return;
    }
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const results = [];

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
  });
  await waitForBuilderReady(page);
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("B cover logo test");
  await page
    .locator("section")
    .filter({ hasText: "디지털 채널" })
    .first()
    .getByRole("button", { name: "추가" })
    .first()
    .click();

  await page.getByTestId("builder-cover-logo-input").setInputFiles(logoPath);
  let uploadedUrl = null;
  try {
    await page.waitForSelector('[data-testid="builder-cover-logo-thumb"]', {
      timeout: 20_000,
    });
    uploadedUrl = await page
      .getByTestId("builder-cover-logo-thumb")
      .getAttribute("src");
    results.push({
      step: "upload via Bunny UI shows thumbnail",
      ok: Boolean(uploadedUrl?.startsWith("http")),
      detail: uploadedUrl?.slice(0, 80),
    });
  } catch {
    results.push({
      step: "upload via Bunny UI shows thumbnail",
      ok: false,
      detail: "Bunny unavailable locally — will inject coverLogoUrl via PATCH fallback",
    });
  }

  let save = await clickSaveAndWaitForReportId(page);
  results.push({ step: "save report", ok: save.ok, detail: save.reportId });

  if (!uploadedUrl && save.reportId) {
    const patchRes = await context.request.patch(
      `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
      {
        data: {
          ...(await (
            await context.request.get(
              `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
              { credentials: "include" },
            )
          ).json()).payload,
          coverLogoUrl: FALLBACK_LOGO_URL,
        },
      },
    );
    results.push({
      step: "PATCH fallback coverLogoUrl",
      ok: patchRes.ok(),
      detail: FALLBACK_LOGO_URL,
    });
    uploadedUrl = FALLBACK_LOGO_URL;
    await page.goto(
      `${BASE}/ko/admin/reports?type=builder&step=2&id=${save.reportId}`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForBuilderReady(page);
    results.push({
      step: "reopen after PATCH shows thumb",
      ok: (await page.getByTestId("builder-cover-logo-thumb").count()) > 0,
    });
  }

  await goToPreview(page, BASE, save.reportId);
  const previewLogo = page
    .getByTestId("campaign-builder-report-preview")
    .locator("img")
    .first();
  const previewLogoSrc = await previewLogo.getAttribute("src");
  results.push({
    step: "preview cover logo visible",
    ok: Boolean(
      previewLogoSrc &&
        (previewLogoSrc === uploadedUrl ||
          previewLogoSrc.includes("favicon") ||
          previewLogoSrc.includes("cdn")),
    ),
    detail: previewLogoSrc?.slice(0, 80),
  });

  const [pdfDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "with-logo.pdf");
  await pdfDl.saveAs(pdfPath);
  const pdfBuf = await readFile(pdfPath);
  results.push({
    step: "PDF export with logo",
    ok: pdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF") && pdfBuf.length > 5000,
    detail: `size=${pdfBuf.length}`,
  });

  const [pptxDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "with-logo.pptx");
  await pptxDl.saveAs(pptxPath);
  const pptx1 = (await pptxXml(pptxPath)).join("\n");
  results.push({
    step: "PPTX export with logo (has image embed)",
    ok: pptx1.includes("<p:pic") || pptx1.includes("pic:blipFill"),
    detail: "slide1 xml checked",
  });

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2&id=${save.reportId}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForBuilderReady(page);
  const reopenedSrc = await page
    .getByTestId("builder-cover-logo-thumb")
    .getAttribute("src");
  results.push({
    step: "reopen ?id= retains logo thumb",
    ok: Boolean(reopenedSrc && (reopenedSrc === uploadedUrl || reopenedSrc.includes("favicon"))),
    detail: reopenedSrc?.slice(0, 80),
  });

  const getAfterReopen = await context.request.get(
    `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
    { credentials: "include" },
  );
  const stored = (await getAfterReopen.json()).payload;
  results.push({
    step: "GET after reopen has coverLogoUrl",
    ok: Boolean(stored?.coverLogoUrl?.trim()),
    detail: stored?.coverLogoUrl?.slice(0, 80),
  });

  await page.getByTestId("builder-cover-logo-remove").click();
  results.push({
    step: "remove logo clears UI thumb",
    ok: (await page.getByTestId("builder-cover-logo-thumb").count()) === 0,
  });

  await clickSaveAndWaitForReportId(page);
  await goToPreview(page, BASE, save.reportId);
  const previewImgs = await page
    .getByTestId("campaign-builder-report-preview")
    .locator("img")
    .count();
  results.push({
    step: "preview after remove — no cover logo img",
    ok: previewImgs === 0,
    detail: `imgCount=${previewImgs}`,
  });

  await context.request.delete(
    `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
  );

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
  });
  await waitForBuilderReady(page);
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("B no-logo regression");
  await page
    .locator("section")
    .filter({ hasText: "디지털 채널" })
    .first()
    .getByRole("button", { name: "추가" })
    .first()
    .click();
  const noLogoSave = await clickSaveAndWaitForReportId(page);
  await goToPreview(page, BASE, noLogoSave.reportId);
  const noLogoPreviewImgs = await page
    .getByTestId("campaign-builder-report-preview")
    .locator("img")
    .count();
  results.push({
    step: "regression — report without logo has no cover img",
    ok: noLogoPreviewImgs === 0,
  });
  await context.request.delete(
    `${BASE}/api/admin/campaign-builder/reports/${noLogoSave.reportId}`,
  );

  results.push({
    step: "no console errors",
    ok: consoleErrors.length === 0,
    detail:
      consoleErrors.slice(0, 3).join(" | ") ||
      (bunnyUploadUnavailable
        ? "ignored expected 503 (local Bunny not configured)"
        : "none"),
  });

  await writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
