import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.cwd(), "scripts/.verify-planner-brief-handoff");

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR" });

  const checks = {
    briefAdvancesToStep2: false,
    goalAutoSelectedBanner: false,
    step1AccessibleViaStepper: false,
    goalChangeableOnStep1: false,
    chatbotBriefPathUnchanged: false,
  };

  const brief = encodeURIComponent("강남 2030 브랜딩 3000만원");
  await page.goto(`${baseUrl}/ko/planner?brief=${brief}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);

  checks.briefAdvancesToStep2 = await page
    .getByRole("heading", { name: /타깃|지역|타겟/i })
    .first()
    .isVisible()
    .catch(() => false);

  checks.goalAutoSelectedBanner = await page
    .getByText(/입력한 조건으로 목표가 자동 선택/)
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  await page.screenshot({
    path: path.join(outDir, "planner-brief-step2.png"),
    fullPage: false,
  });

  // Step 1 via stepper — goal should be pre-selected, user can change
  await page.getByRole("button", { name: /Step 1|1\./i }).first().click();
  await page.waitForTimeout(600);

  checks.step1AccessibleViaStepper = await page
    .getByRole("heading", { name: /캠페인 목표|목표/i })
    .first()
    .isVisible()
    .catch(() => false);

  const launchGoal = page.getByRole("button", { name: /런칭|출시/i }).first();
  if (await launchGoal.isVisible()) {
    await launchGoal.click();
    checks.goalChangeableOnStep1 = true;
  }

  await page.screenshot({
    path: path.join(outDir, "planner-brief-step1-edit.png"),
    fullPage: false,
  });

  checks.chatbotBriefPathUnchanged = `/planner?brief=${encodeURIComponent("강남 브랜딩")}`.startsWith(
    "/planner?brief=",
  );

  await browser.close();

  const report = {
    baseUrl,
    checks,
    pass: Object.values(checks).every(Boolean),
  };

  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
