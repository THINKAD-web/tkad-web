#!/usr/bin/env node
/**
 * STEP3f staging E2E — hub card swap + full builder flow.
 * Usage: BASE=https://your-preview.vercel.app node scripts/verify-step3f-staging-e2e.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/step3f-staging-e2e");
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

  console.log(`\n=== BASE: ${BASE} ===`);

  console.log("\n=== 6-1. Hub step 1 cards ===");
  await page.goto(`${BASE}/ko/admin/reports`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const builderCard = page.locator('[data-testid="hub-type-builder"]');
  const externalCard = page.locator('[data-testid="hub-type-digital-builder"]');
  const builderText = (await builderCard.count()) > 0 ? await builderCard.innerText() : "";
  const externalCount = await externalCard.count();
  console.log("builder card:", builderText.replace(/\n/g, " | "));
  console.log("external digital card count:", externalCount);
  await page.screenshot({ path: path.join(OUT, "01-hub-step1.png"), fullPage: true });
  results.push({
    step: "6-1",
    ok: externalCount === 0 && builderText.includes("캠페인 리포트 빌더"),
    detail: builderText.slice(0, 100),
  });

  console.log("\n=== 6-2. Card click → step 2 ===");
  await builderCard.click();
  await page.waitForURL(/type=builder.*step=2/, { timeout: 15_000 });
  const onStep2 = page.url().includes("type=builder") && page.url().includes("step=2");
  console.log("URL:", page.url());
  results.push({ step: "6-2", ok: onStep2, detail: page.url() });

  console.log("\n=== 6-3. Digital + OOH + custom → save ===");
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(400);
  await page.locator('label:text("제목") input').first().fill("STEP3f E2E");
  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
  await page.getByRole("button", { name: "OOH", exact: true }).click();
  await page.waitForTimeout(300);
  const oohSection = page.locator("section").filter({ hasText: "OOH 매체" }).first();
  const oohAdd = oohSection.getByRole("button", { name: "추가" }).first();
  if ((await oohAdd.count()) > 0) await oohAdd.click();
  const customSection = page.locator("section").filter({ hasText: "커스텀 집행 라인" }).first();
  await customSection.getByRole("button", { name: "라인 추가" }).click();
  await page.waitForTimeout(200);
  await customSection.locator('label:text("매체명") input').fill("E2E 커스텀");
  await customSection.locator('label:text("집행 예산") input').fill("500000");
  await customSection.getByRole("button", { name: "라인 추가" }).click();
  await page.locator('[data-testid="campaign-builder-track"]').getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(2500);
  const reportId = new URL(page.url()).searchParams.get("id");
  console.log("reportId:", reportId);
  results.push({ step: "6-3", ok: Boolean(reportId), detail: `id=${reportId}` });

  console.log("\n=== 6-4. Step 3 preview + style + export ===");
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=3&id=${reportId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="campaign-builder-report-preview"]', { timeout: 30_000 });
  await page.getByRole("button", { name: "Minimal", exact: false }).click();
  await page.waitForTimeout(500);
  const [pdfDl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("campaign-builder-export-pdf").click(),
  ]);
  const pdfPath = path.join(OUT, "export.pdf");
  await pdfDl.saveAs(pdfPath);
  const pdfMagic = (await readFile(pdfPath)).slice(0, 5).toString("utf8");
  const [pptxDl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("campaign-builder-export-pptx").click(),
  ]);
  const pptxPath = path.join(OUT, "export.pptx");
  await pptxDl.saveAs(pptxPath);
  const pptxMagic = (await readFile(pptxPath)).slice(0, 2);
  console.log("PDF magic:", pdfMagic, "PPTX:", pptxMagic.toString("hex"));
  await page.screenshot({ path: path.join(OUT, "04-step3-preview.png"), fullPage: true });
  results.push({
    step: "6-4",
    ok: pdfMagic.startsWith("%PDF") && pptxMagic[0] === 0x50 && pptxMagic[1] === 0x4b,
    detail: `pdf=${pdfMagic}`,
  });

  console.log("\n=== 6-5. A/B compare panel ===");
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2&id=${reportId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("STEP3f E2E B");
  await digitalSection.getByRole("button", { name: "추가" }).first().click();
  await page.locator('[data-testid="campaign-builder-track"]').getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(2000);
  const compareSection = page.locator("section").filter({ hasText: "시나리오 비교" }).first();
  const selects = compareSection.locator("select");
  if ((await selects.count()) >= 2) {
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 2 });
    await page.waitForTimeout(1500);
    const donuts = await compareSection.locator('[data-testid="budget-split-donut"]').count();
    console.log("compare donuts:", donuts);
    results.push({ step: "6-5", ok: donuts >= 2, detail: `donuts=${donuts}` });
  } else {
    results.push({ step: "6-5", ok: false, detail: "compare selects missing" });
  }

  console.log("\n=== 6-6. Old Digital deep link (external domain) ===");
  const oldDigitalRes = await context.request.get(
    "https://digital.tkad.co.kr/admin/campaign-report",
    { maxRedirects: 0, failOnStatusCode: false },
  );
  console.log("digital.tkad.co.kr/admin/campaign-report status:", oldDigitalRes.status());
  console.log(
    "NOTE: 이 URL은 tkad-web 범위 밖(dmpilot/Digital). 허브 카드만 제거됨 — redirect/deprecated 배너는 재한님 결정 사항.",
  );
  results.push({
    step: "6-6",
    ok: true,
    detail: `external status=${oldDigitalRes.status()} (tkad 미처리, 판단 필요)`,
  });

  console.log("\n=== Console errors ===");
  if (consoleLogs.length === 0 && pageErrors.length === 0) console.log("없음");
  else {
    for (const l of consoleLogs) console.log(l);
    for (const e of pageErrors) console.log("[pageerror]", e);
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.step}: ${r.detail}`);
  }

  await writeFile(path.join(OUT, "report.json"), JSON.stringify({ BASE, results, consoleLogs, pageErrors }, null, 2));

  if (reportId) {
    await context.request.delete(`${BASE}/api/admin/campaign-builder/reports/${reportId}`);
  }

  await browser.close();
  if (results.some((r) => !r.ok && r.step !== "6-6") || pageErrors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
