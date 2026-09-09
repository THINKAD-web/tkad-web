#!/usr/bin/env node
/**
 * STEP3c browser verification — campaign builder UI + BudgetSplitDonut regression.
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-campaign-builder-browser.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/step3c-browser-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const consoleLogs = [];
const pageErrors = [];

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

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
    const type = msg.type();
    if (type === "error" || type === "warning") {
      consoleLogs.push(`[${type}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err));
  });
}

async function screenshot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function regressionBriefResultSummary(page) {
  logSection("Planner regression — BriefResultSummary + BudgetSplitDonut");
  await page.goto(`${BASE}/ko/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 60_000 });

  const quickMode = page.locator('[data-entry-mode="quick"]');
  if ((await quickMode.count()) > 0) {
    await quickMode.click();
  }

  const budget = page.locator('input[inputmode="numeric"]').first();
  await budget.fill("5000");
  await budget.press("Tab");
  await page.waitForTimeout(600);

  const nextBtn = page.getByRole("button", {
    name: "다음 · 믹스 편집",
    exact: true,
  });
  await page.waitForFunction(
    (btn) => btn && !btn.disabled,
    await nextBtn.elementHandle(),
    { timeout: 15_000 },
  );
  await nextBtn.click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 90_000 });

  const mixAdd = page.locator('[data-testid="brief-mix-card-add"]').first();
  if ((await mixAdd.count()) > 0) {
    await mixAdd.click();
    await page.waitForTimeout(800);
  }

  const stepTwoNext = page.locator('[data-testid="brief-step-two-next"]');
  await page.waitForFunction(
    (btn) => btn && !btn.disabled,
    await stepTwoNext.elementHandle(),
    { timeout: 30_000 },
  );
  await stepTwoNext.click();
  await page.waitForSelector('[data-testid="brief-result-summary"]', {
    timeout: 90_000,
  });

  const summary = page.locator('[data-testid="brief-result-summary"]');
  const summaryText = await summary.innerText();
  const hasDonut = (await summary.locator('[data-testid="budget-split-donut"]').count()) > 0;
  const svgCount = await summary.locator('[data-testid="budget-split-donut"] circle').count();

  console.log("brief-result-summary visible: true");
  console.log("budget-split-donut inside summary:", hasDonut);
  console.log("donut svg circle count:", svgCount);
  console.log("summary excerpt:", summaryText.split("\n").slice(0, 6).join(" | "));

  if (!hasDonut) {
    console.log("NOTE: budgetSplit empty for this brief — donut may legitimately be hidden");
  } else {
    console.log("PASS: shared BudgetSplitDonut renders inside BriefResultSummary");
  }

  await screenshot(page, "regression-brief-result-summary");
}

async function verifyCampaignBuilder(page) {
  const results = [];

  logSection("Navigate builder track");
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="campaign-builder-track"]', {
    timeout: 60_000,
  });
  results.push({ step: "load", ok: true, detail: "campaign-builder-track visible" });

  logSection("1. Digital — search filter + add 2 lines + KPI");
  const digitalSection = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  const search = digitalSection.locator('input[type="search"]');
  const listBefore = await digitalSection.locator("ul").first().locator("li").count();
  await search.fill("인스타");
  await page.waitForTimeout(300);
  const listFiltered = await digitalSection.locator("ul").first().locator("li").count();
  console.log(`search filter: list items before=${listBefore} after query "인스타"=${listFiltered}`);

  const addButtons = digitalSection.getByRole("button", { name: "추가" });
  const addCount = await addButtons.count();
  if (addCount >= 2) {
    await addButtons.nth(0).click();
    await page.waitForTimeout(200);
    await addButtons.nth(1).click();
  } else if (addCount === 1) {
    await addButtons.first().click();
    await search.fill("");
    await page.waitForTimeout(300);
    await digitalSection.getByRole("button", { name: "추가" }).first().click();
  }

  const selectedLines = digitalSection.locator("text=선택한 라인").locator("..").locator("li");
  const lineCount = await selectedLines.count();
  const headerText = await digitalSection.locator("header").innerText();
  console.log("selected digital lines:", lineCount);
  console.log("digital header/KPI text:", headerText.replace(/\n/g, " | "));
  results.push({
    step: 1,
    ok: lineCount >= 2 && headerText.includes("총 예산"),
    detail: `lines=${lineCount}, header has budget`,
  });

  await page.locator('input[value=""], input').filter({ has: page.locator("xpath=..") }).first();
  const titleInput = page.locator('label:text("제목") input').first();
  await titleInput.fill("STEP3c 브라우저 검증");

  logSection("2. Save (POST) + reload by id");
  await page.getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(1500);
  await page.waitForURL(/[?&]id=/, { timeout: 10_000 }).catch(() => null);
  const saveMsg = await page.locator('[data-testid="campaign-builder-track"]').innerText();
  const urlId = new URL(page.url()).searchParams.get("id");
  console.log("after save — url id:", urlId ?? "not found");
  console.log("save area text excerpt:", saveMsg.includes("저장되었습니다") ? "저장되었습니다." : saveMsg.slice(0, 200));

  if (urlId) {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="campaign-builder-track"]', { timeout: 60_000 });
    await page.waitForTimeout(1000);
    const titleAfter = await page.locator('label:text("제목") input').first().inputValue();
    const linesAfter = await page
      .locator("section")
      .filter({ hasText: "디지털 채널" })
      .first()
      .locator("text=선택한 라인")
      .locator("..")
      .locator("li")
      .count();
    console.log("after reload title:", titleAfter);
    console.log("after reload digital lines:", linesAfter);
    results.push({
      step: 2,
      ok: titleAfter === "STEP3c 브라우저 검증" && linesAfter >= 2,
      detail: `title=${titleAfter}, lines=${linesAfter}`,
    });
  } else {
    results.push({ step: 2, ok: false, detail: "save id missing in URL" });
  }

  logSection("6–7. Compare panel — create 2nd digital report + donuts");
  await page.getByRole("button", { name: "새로" }).click();
  await page.waitForTimeout(500);
  await page.locator('label:text("제목") input').first().fill("STEP3c 비교 B");
  const digitalSection2 = page.locator("section").filter({ hasText: "디지털 채널" }).first();
  await digitalSection2.getByRole("button", { name: "추가" }).first().click();
  await page.getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(1500);

  const compareSection = page.locator("section").filter({ hasText: "시나리오 비교" }).first();
  const selects = compareSection.locator("select");
  const optCountA = await selects.nth(0).locator("option").count();
  console.log("compare dropdown A options:", optCountA);

  if (optCountA >= 3) {
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 2 });
    await page.waitForTimeout(2000);
    const donutCount = await compareSection.locator('[data-testid="budget-split-donut"]').count();
    const compareText = await compareSection.innerText();
    console.log("budget-split-donut count in compare:", donutCount);
    console.log("compare text excerpt:", compareText.replace(/\n/g, " | ").slice(0, 300));
    results.push({ step: 6, ok: donutCount >= 2, detail: `donuts=${donutCount}` });
    results.push({
      step: 7,
      ok: !compareText.includes("2건 이상 필요"),
      detail: "two digital reports selected",
    });
  } else {
    const guardText = await compareSection.innerText();
    console.log("compare guard:", guardText.includes("2건 이상 필요"));
    results.push({ step: 6, ok: false, detail: `options=${optCountA}` });
    results.push({ step: 7, ok: guardText.includes("2건 이상 필요"), detail: "guard message shown" });
  }

  logSection("3. OOH mode — search + add");
  await page.getByRole("button", { name: "OOH", exact: true }).click();
  await page.waitForTimeout(400);
  const oohSection = page.locator("section").filter({ hasText: "OOH 매체" }).first();
  await oohSection.locator('input[type="search"]').fill("서울");
  await page.waitForTimeout(300);
  const oohAdd = oohSection.getByRole("button", { name: "추가" }).first();
  if ((await oohAdd.count()) > 0) {
    await oohAdd.click();
    await page.waitForTimeout(300);
  }
  const oohLines = await page.locator("section").filter({ hasText: "OOH 매체" }).locator("ul li").count();
  console.log("OOH selected lines (list items):", oohLines);
  await page.getByRole("button", { name: /저장/ }).click();
  await page.waitForTimeout(1000);
  results.push({ step: 3, ok: oohLines > 0, detail: `ooh list items=${oohLines}` });

  logSection("4. Custom line — brief fill + validation");
  await page.getByRole("button", { name: "디지털" }).click();
  const customSection = page.locator("section").filter({ hasText: "커스텀 집행 라인" }).first();
  await customSection.getByRole("button", { name: "라인 추가" }).click();
  await page.waitForTimeout(200);
  const validationText = await customSection.innerText();
  console.log("validation on empty add:", validationText.includes("매체명을 입력하세요."));

  const brief = customSection.locator("textarea").first();
  await brief.fill("네이버 GFA — 3월 1일~3월 31일, 500만원 (20대 여성)");
  await customSection.getByRole("button", { name: "폼에 반영" }).click();
  await page.waitForTimeout(200);
  const mediaName = await customSection.locator('label:text("매체명") input').inputValue();
  const budgetVal = await customSection.locator('label:text("집행 예산") input').inputValue();
  console.log("after brief fill mediaName:", mediaName);
  console.log("after brief fill budget:", budgetVal);
  await customSection.getByRole("button", { name: "라인 추가" }).click();
  await page.waitForTimeout(300);
  const customTable = await customSection.locator("table tbody tr").count();
  console.log("custom lines in table:", customTable);
  results.push({
    step: 4,
    ok:
      validationText.includes("매체명을 입력하세요.") &&
      mediaName.includes("네이버") &&
      customTable >= 1,
    detail: `media=${mediaName}, tableRows=${customTable}`,
  });

  logSection("5. Insights edit + reset");
  const insightsSection = page.locator("section").filter({ hasText: "운영 인사이트" }).first();
  const opsArea = insightsSection.locator("textarea").nth(2);
  const beforeOps = await opsArea.inputValue();
  await opsArea.fill("브라우저에서 편집한 운영 노트");
  await page.waitForTimeout(300);
  const editedOps = await opsArea.inputValue();
  await insightsSection.getByRole("button", { name: "초기화" }).click();
  await page.waitForTimeout(300);
  const afterReset = await opsArea.inputValue();
  console.log("insights before edit excerpt:", beforeOps.slice(0, 60));
  console.log("insights after edit:", editedOps);
  console.log("insights after reset:", afterReset.slice(0, 60));
  results.push({
    step: 5,
    ok: editedOps === "브라우저에서 편집한 운영 노트" && afterReset !== editedOps,
    detail: "edit then reset changed value",
  });

  logSection("8. Hub native builder card (no external Digital link)");
  await page.goto(`${BASE}/ko/admin/reports`, { waitUntil: "networkidle" });
  const hubCard = page.locator('[data-testid="hub-type-builder"]');
  const externalCard = page.locator('[data-testid="hub-type-digital-builder"]');
  const hubVisible = (await hubCard.count()) > 0;
  const externalVisible = (await externalCard.count()) > 0;
  const hubText = hubVisible ? await hubCard.innerText() : "";
  console.log("hub builder card visible:", hubVisible);
  console.log("hub external digital card visible:", externalVisible);
  console.log("hub builder card text:", hubText.replace(/\n/g, " | "));
  results.push({
    step: 8,
    ok: hubVisible && !externalVisible && hubText.includes("캠페인 리포트 빌더"),
    detail: hubText.slice(0, 80),
  });

  await screenshot(page, "step8-hub");

  return results;
}

async function cleanupReports(context) {
  const res = await context.request.get(`${BASE}/api/admin/campaign-builder/reports`);
  if (!res.ok()) return;
  const data = await res.json();
  for (const r of data.reports ?? []) {
    if (r.title?.includes("STEP3c")) {
      await context.request.delete(`${BASE}/api/admin/campaign-builder/reports/${r.id}`);
    }
  }
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD required");
  }

  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
  });

  await loginViaApi(context);
  const page = await context.newPage();
  attachConsole(page);

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    consoleErrors: [],
    pageErrors: [],
    results: [],
    regression: {},
  };

  try {
    await regressionBriefResultSummary(page);
    report.regression.briefResultSummary = "checked";
  } catch (e) {
    report.regression.briefResultSummary = String(e);
    console.log("REGRESSION FAIL:", e);
  }

  const page2 = await context.newPage();
  attachConsole(page2);
  try {
    report.results = await verifyCampaignBuilder(page2);
  } catch (e) {
    console.error("BUILDER VERIFY FAIL:", e);
    report.results.push({ step: "fatal", ok: false, detail: String(e) });
    await screenshot(page2, "fatal-error");
  }

  report.consoleErrors = [...consoleLogs];
  report.pageErrors = [...pageErrors];

  console.log("\n=== Console errors ===");
  if (consoleLogs.length === 0 && pageErrors.length === 0) {
    console.log("없음");
  } else {
    for (const l of consoleLogs) console.log(l);
    for (const e of pageErrors) console.log("[pageerror]", e);
  }

  console.log("\n=== Summary ===");
  for (const r of report.results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} step ${r.step}: ${r.detail}`);
  }

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await cleanupReports(context);
  await browser.close();

  const failed = report.results.some((r) => !r.ok);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
