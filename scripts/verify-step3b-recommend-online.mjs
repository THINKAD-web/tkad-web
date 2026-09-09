#!/usr/bin/env node
/**
 * STEP3b — AI플래너 온라인 믹스 UI 브라우저 검증
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-step3b-recommend-online.mjs
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const consoleErrors = [];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

function freshIpHeaders() {
  const a = Math.floor(Math.random() * 200) + 10;
  const b = Math.floor(Math.random() * 200) + 10;
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Forwarded-For": `10.${a}.${b}.${Math.floor(Math.random() * 200) + 1}`,
  };
}

async function newPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    extraHTTPHeaders: freshIpHeaders(),
  });
  const page = await context.newPage();
  return { page, context };
}

async function prepareRecommendForm(page) {
  await page.goto(`${BASE}/ko/recommend`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(() => {
    sessionStorage.removeItem("tkad_recommend_session_v2");
  });
  const freshStart = page.getByRole("button", { name: "새로 시작" });
  if (await freshStart.isVisible().catch(() => false)) {
    await freshStart.click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: "구조화 입력" }).click();
}

async function fillAndAnalyze(page, { budgetMan = 500, digitalPct = null, goal = "브랜드 인지" } = {}) {
  await prepareRecommendForm(page);
  await page.getByRole("button", { name: goal }).click();
  await page.locator("label").filter({ hasText: /^서울$/ }).click();
  const budgetSlider = page.locator('input[type="range"]').first();
  await budgetSlider.evaluate((el, val) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(el, String(val));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, budgetMan);
  let sliderBeforeSubmit = null;
  const digitalSlider = page.getByTestId("recommend-digital-budget-slider");
  if (await digitalSlider.count()) {
    sliderBeforeSubmit = await digitalSlider.inputValue();
    if (digitalPct != null) {
      await digitalSlider.evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(el, String(val));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, digitalPct);
      sliderBeforeSubmit = String(digitalPct);
    }
  }
  await page.getByRole("button", { name: "유통/리테일" }).click();
  await page.getByRole("button", { name: "AI 분석 시작" }).click();
  await page.waitForSelector('[data-testid="recommend-online-mix-section"]', {
    timeout: 180_000,
  });
  await page.waitForTimeout(800);
  return { sliderBeforeSubmit };
}

async function main() {
  const browser = await launchBrowser();
  const results = [];
  console.log(`\n=== STEP3b browser verify BASE=${BASE} ===\n`);

  // 1. Default slider + goal default online
  const { page, context: ctx1 } = await newPage(browser);
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("401 (Unauthorized)")) return;
    if (text.includes("Encountered two children with the same key")) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  const s1 = await fillAndAnalyze(page, { budgetMan: 500 });
  const onlineStatus1 = await page.locator("[data-testid=recommend-online-mix-section]").getAttribute("data-online-status");
  const donut1 = await page.locator("[data-testid=budget-split-donut]").count();
  const cards1 = await page.locator("[data-testid=brief-online-channel-card]").count();
  results.push({
    step: "1_default_goal_slider",
    sliderValue: s1.sliderBeforeSubmit,
    onlineStatus: onlineStatus1,
    donutVisible: donut1 > 0,
    onlineCardCount: cards1,
    pass: onlineStatus1 === "ok" && s1.sliderBeforeSubmit === "35" && donut1 > 0 && cards1 > 0,
  });

  await ctx1.close();

  // 2. Slider change + re-analyze
  const { page: page2, context: ctx2 } = await newPage(browser);
  const s2 = await fillAndAnalyze(page2, { budgetMan: 500, digitalPct: 50 });
  const onlineStatus2 = await page2.locator("[data-testid=recommend-online-mix-section]").getAttribute("data-online-status");
  const sectionText2 = await page2.locator("[data-testid=recommend-online-mix-section]").innerText();
  results.push({
    step: "2_slider_50pct",
    sliderValue: s2.sliderBeforeSubmit,
    onlineStatus: onlineStatus2,
    sectionContains50: /50/.test(sectionText2),
    pass: onlineStatus2 === "ok" && s2.sliderBeforeSubmit === "50" && /50/.test(sectionText2),
  });

  await ctx2.close();

  // 3. Low budget budget_too_small
  const { page: page3, context: ctx3 } = await newPage(browser);
  await fillAndAnalyze(page3, { budgetMan: 100, digitalPct: 10 });
  const onlineStatus3 = await page3.locator("[data-testid=recommend-online-mix-section]").getAttribute("data-online-status");
  const msg3 = await page3.locator("[data-testid=recommend-online-mix-section]").innerText();
  results.push({
    step: "3_budget_too_small",
    onlineStatus: onlineStatus3,
    messageSnippet: msg3.replace(/\s+/g, " ").slice(0, 150),
    pass: onlineStatus3 === "budget_too_small" && /최소 집행금액/.test(msg3),
  });

  await ctx3.close();

  // 4. Digital 0%
  const { page: page4, context: ctx4 } = await newPage(browser);
  await fillAndAnalyze(page4, { budgetMan: 500, digitalPct: 0 });
  const onlineStatus4 = await page4.locator("[data-testid=recommend-online-mix-section]").getAttribute("data-online-status");
  const msg4 = await page4.locator("[data-testid=recommend-online-mix-section]").innerText();
  results.push({
    step: "4_digital_budget_zero",
    onlineStatus: onlineStatus4,
    messageSnippet: msg4.replace(/\s+/g, " ").slice(0, 150),
    pass: onlineStatus4 === "digital_budget_zero" && /0%|디지털 예산/.test(msg4),
  });

  await ctx4.close();

  // 5. Donut labels + 7. OOH regression
  const { page: page5, context: ctx5 } = await newPage(browser);
  await fillAndAnalyze(page5, { budgetMan: 500 });
  const donutText = await page5.locator("[data-testid=budget-split-donut]").innerText();
  results.push({
    step: "5_donut_render",
    donutText: donutText.replace(/\s+/g, " ").trim().slice(0, 200),
    pass: /OOH/.test(donutText) && /온라인/.test(donutText),
  });

  const mapVisible = (await page5.getByText("MEDIA MAP").count()) > 0;
  const top3Visible = (await page5.getByText("TKAD BOT TOP 3").count()) > 0;
  results.push({
    step: "7_ooh_regression",
    mapVisible,
    top3Visible,
    pass: mapVisible && top3Visible,
  });

  // 6. Console errors
  results.push({
    step: "6_console_errors",
    errors: consoleErrors,
    pass: consoleErrors.length === 0,
  });

  await ctx5.close();
  await browser.close();

  for (const r of results) {
    console.log(JSON.stringify(r, null, 2));
    console.log(r.pass ? "  → PASS" : "  → FAIL");
  }

  const allPass = results.every((r) => r.pass);
  console.log(`\n=== ${allPass ? "ALL PASS" : "SOME FAILED"} (${results.filter((r) => r.pass).length}/${results.length}) ===\n`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
