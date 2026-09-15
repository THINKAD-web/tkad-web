#!/usr/bin/env node
/**
 * Mobile keyboard scroll jitter check — /ko/recommend AI freetext textarea
 * Usage: BASE=http://127.0.0.1:3000 node scripts/verify-mobile-keyboard-jitter.mjs
 */
import { chromium, devices } from "playwright";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  const page = await context.newPage();

  const scrollLog = [];
  await page.exposeFunction("logScroll", (y) => scrollLog.push(y));
  await page.addInitScript(() => {
    let last = window.scrollY;
    window.addEventListener(
      "scroll",
      () => {
        const y = Math.round(window.scrollY);
        if (Math.abs(y - last) >= 4) {
          last = y;
          window.logScroll?.(y);
        }
      },
      { passive: true },
    );
  });

  await page.goto(`${BASE}/ko/recommend`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);

  const aiTab = page.getByRole("button", { name: /AI 자연어 입력/i });
  if (await aiTab.isVisible()) {
    await aiTab.click();
    await page.waitForTimeout(500);
  }

  const textarea = page.locator("textarea").first();
  await textarea.scrollIntoViewIfNeeded();
  await textarea.click();
  await page.waitForTimeout(800);

  scrollLog.length = 0;
  await textarea.type("제주 지역 주민 타겟 브랜드 캠페인 3천만원", { delay: 80 });
  await page.waitForTimeout(1200);

  const scrollEventsDuringTyping = scrollLog.length;
  const scrollRange =
    scrollLog.length > 0
      ? Math.max(...scrollLog) - Math.min(...scrollLog)
      : 0;

  console.log("scroll events during typing:", scrollEventsDuringTyping);
  console.log("scroll Y range (px):", scrollRange);
  console.log("scroll samples:", scrollLog.slice(0, 12));

  // Also check login form (control — should not spike)
  await page.goto(`${BASE}/ko/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  scrollLog.length = 0;
  const loginInput = page.locator('input[type="email"], input[type="text"]').first();
  if (await loginInput.isVisible()) {
    await loginInput.click();
    await loginInput.type("test@example.com", { delay: 80 });
    await page.waitForTimeout(800);
  }
  const loginScrollEvents = scrollLog.length;
  console.log("login scroll events during typing:", loginScrollEvents);

  await browser.close();

  const ok = scrollEventsDuringTyping <= 3 && scrollRange <= 80;
  console.log(ok ? "PASS: low scroll churn on recommend freetext" : "FAIL: excessive scroll churn");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
