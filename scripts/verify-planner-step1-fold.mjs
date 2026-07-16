import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.cwd(), "scripts/.verify-planner-step1-fold");

async function measure(page, vh) {
  return page.evaluate((viewportHeight) => {
    const recommend = [...document.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("AI 플래너로 이동"),
    );
    const trial = [...document.querySelectorAll("a")].find((a) =>
      a.href?.includes("/pricing") && a.textContent?.includes("무료 체험"),
    );
    const tipBox = document.querySelector('[role="status"]')?.closest(
      ".border-2.border-primary",
    );
    const goal = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("브랜드 인지"),
    );
    const goals = document.querySelectorAll('button[class*="selectChip"]');
    const visibleGoals = [...goals].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.top < viewportHeight && r.bottom > 0;
    }).length;

    return {
      viewportHeight,
      recommendHintVisible: Boolean(recommend && recommend.getBoundingClientRect().top < viewportHeight),
      trialBannerVisible: Boolean(trial && trial.getBoundingClientRect().top < viewportHeight),
      fullTipBoxVisible: Boolean(tipBox && tipBox.getBoundingClientRect().top < viewportHeight),
      firstGoalTop: goal ? Math.round(goal.getBoundingClientRect().top) : null,
      firstGoalAboveFold: goal ? goal.getBoundingClientRect().top < viewportHeight : false,
      visibleGoalCount: visibleGoals,
      totalGoals: goals.length,
    };
  }, vh);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { baseUrl, desktop: null, mobile: null, step2: null, step6: null };

  for (const [label, viewport] of [
    ["desktop", { width: 1280, height: 800 }],
    ["mobile", devices["iPhone 13"].viewport],
  ]) {
    const page = await browser.newPage({ locale: "ko-KR" });
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/ko/planner`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(1200);
    report[label] = await measure(page, viewport.height);
    await page.screenshot({
      path: path.join(outDir, `${label}-step1-after.png`),
      fullPage: false,
    });
    await page.close();
  }

  const page = await browser.newPage({ locale: "ko-KR" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseUrl}/ko/planner`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  const goal = page.getByRole("button", { name: /브랜드 인지/ }).first();
  if ((await goal.count()) > 0) {
    await goal.click();
    const next = page.getByRole("button", { name: /^다음$/ }).first();
    if ((await next.count()) > 0) await next.click();
    await page.waitForTimeout(600);
    report.step2 = await measure(page, 800);
    await page.screenshot({
      path: path.join(outDir, "desktop-step2-after.png"),
      fullPage: false,
    });
  }

  // Step 6 trial banner — click through quickly via stepper if possible
  const step6 = page.locator('button, [role="button"]').filter({ hasText: /^6$/ }).first();
  if ((await step6.count()) > 0) {
    // need valid state — skip if can't proceed
  }

  await browser.close();

  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
