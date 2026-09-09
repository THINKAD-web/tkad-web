#!/usr/bin/env node
/**
 * STEP3e browser verification — preview step 3 + export buttons.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-step3e-browser.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/step3e-browser-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const consoleLogs = [];
const pageErrors = [];

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

function attachConsole(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
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
  attachConsole(page);

  const results = [];

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]', { timeout: 60_000 });

  console.log("\n=== 1. Save → step 3 preview ===");
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("STEP3e 브라우저 검증");
  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
  await page.locator('[data-testid="campaign-builder-track"]').getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(2500);
  const urlAfterSave = page.url();
  const hasId = urlAfterSave.includes("id=");
  console.log("URL after save:", urlAfterSave);

  const reportId = new URL(page.url()).searchParams.get("id");
  await page.getByTestId("campaign-builder-go-preview").click();
  await page.waitForTimeout(800);
  if (!page.url().includes("step=3") && reportId) {
    await page.goto(
      `${BASE}/ko/admin/reports?type=builder&step=3&id=${encodeURIComponent(reportId)}`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1000);
  }
  console.log("URL after preview nav:", page.url());
  await page.waitForSelector('[data-testid="campaign-builder-report-preview"]', {
    timeout: 30_000,
  });
  const previewVisible = await page.getByTestId("campaign-builder-report-preview").isVisible();
  const digitalRows = await page.getByTestId("builder-preview-digital").locator("tbody tr").count();
  console.log("preview visible:", previewVisible);
  console.log("digital rows in preview:", digitalRows);
  results.push({
    step: 1,
    ok: hasId && previewVisible && digitalRows >= 1,
    detail: `id=${hasId}, preview=${previewVisible}, rows=${digitalRows}`,
  });
  await page.screenshot({ path: path.join(OUT, "step3-preview.png"), fullPage: true });

  console.log("\n=== 2. Style switch ===");
  const heroBefore = await page.getByTestId("campaign-builder-report-preview").evaluate((el) => {
    const hero = el.querySelector(".tkad-planner-dark-surface");
    return hero ? getComputedStyle(hero).backgroundColor : "";
  });
  await page.getByRole("button", { name: "Minimal", exact: false }).click();
  await page.waitForTimeout(500);
  const heroAfter = await page.getByTestId("campaign-builder-report-preview").evaluate((el) => {
    const hero = el.querySelector(".tkad-planner-dark-surface");
    return hero ? getComputedStyle(hero).backgroundColor : "";
  });
  console.log("hero bg before:", heroBefore);
  console.log("hero bg after minimal:", heroAfter);
  results.push({
    step: 2,
    ok: heroBefore !== heroAfter,
    detail: `${heroBefore} → ${heroAfter}`,
  });

  console.log("\n=== 3. PDF download ===");
  const [pdfDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "downloaded.pdf");
  await pdfDownload.saveAs(pdfPath);
  const pdfHead = (await readFile(pdfPath)).slice(0, 5).toString("utf8");
  const pdfSize = (await readFile(pdfPath)).length;
  console.log("PDF size:", pdfSize, "magic:", pdfHead);
  results.push({
    step: 3,
    ok: pdfHead.startsWith("%PDF") && pdfSize > 10_000,
    detail: `size=${pdfSize}, magic=${pdfHead}`,
  });

  console.log("\n=== 4. PPTX download ===");
  const [pptxDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "downloaded.pptx");
  await pptxDownload.saveAs(pptxPath);
  const pptxHead = (await readFile(pptxPath)).slice(0, 2);
  const pptxSize = (await readFile(pptxPath)).length;
  console.log("PPTX size:", pptxSize, "magic:", pptxHead.toString("hex"));
  results.push({
    step: 4,
    ok: pptxHead[0] === 0x50 && pptxHead[1] === 0x4b && pptxSize > 10_000,
    detail: `size=${pptxSize}`,
  });

  console.log("\n=== 5. Unsaved report — export disabled ===");
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("STEP3e 미저장");
  await page.getByTestId("campaign-builder-go-preview").click();
  await page.waitForURL(/step=3/, { timeout: 10_000 });
  const pdfDisabled = await page.getByTestId("campaign-builder-export-pdf").isDisabled();
  const saveHint = await page.getByText("PDF·PPTX를 다운로드하려면").isVisible();
  console.log("export pdf disabled:", pdfDisabled);
  console.log("save hint visible:", saveHint);
  results.push({
    step: 5,
    ok: pdfDisabled && saveHint,
    detail: `disabled=${pdfDisabled}, hint=${saveHint}`,
  });

  console.log("\n=== Console errors ===");
  if (consoleLogs.length === 0 && pageErrors.length === 0) {
    console.log("없음");
  } else {
    for (const l of consoleLogs) console.log(l);
    for (const e of pageErrors) console.log("[pageerror]", e);
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} step ${r.step}: ${r.detail}`);
  }

  await writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify({ results, consoleLogs, pageErrors }, null, 2),
  );
  await browser.close();

  if (results.some((r) => !r.ok) || pageErrors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
