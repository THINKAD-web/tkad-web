/**
 * Q-1: O-1/O-2 토글 조작 후 getSnapshot / infinite loop 콘솔 없음 확인.
 * Usage: npx tsx scripts/verify-q1-o-toggles.mts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/ko/planner";
const critical: string[] = [];

function watch(page: Page) {
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("getSnapshot") || t.includes("Maximum update depth")) {
      critical.push(t);
    }
  });
  page.on("pageerror", (e) => critical.push(e.message));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR", viewport: { width: 1280, height: 900 } });
  watch(page);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-entry-mode="quick"]', { timeout: 15_000 });

  // O-2: entry mode toggles
  await page.locator('[data-entry-mode="quick"]').click();
  await page.waitForTimeout(500);
  await page.locator('input[placeholder="3000"]').fill("3000");
  await page.getByRole("button", { name: "서울" }).click();
  await page.waitForTimeout(800);
  await page.locator('[data-entry-mode="detailed"]').click();
  await page.waitForTimeout(500);

  // O-1: channel mode toggles (detailed mode)
  await page.locator('[data-channel-mode="ooh_digital"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-channel-mode="ooh_only"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-channel-mode="ooh_digital"]').click();

  // Fill required fields → Step 2 (digital panel)
  await page.locator('input[placeholder="3000"]').fill("5000");
  await page.locator('input[type="date"]').first().fill("2026-08-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-08-31");
  await page.getByRole("button", { name: "다음 · 믹스 편집" }).click();
  await page.waitForSelector('[data-testid="brief-digital-panel"]', { timeout: 15_000 });
  await page.waitForTimeout(2000);

  // Back to Step 1, toggle again
  await page.getByRole("button", { name: "← 브리프" }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-entry-mode="quick"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-entry-mode="detailed"]').click();
  await page.waitForTimeout(1000);

  await browser.close();

  console.log("\n--- critical 콘솔 ---");
  console.log(critical.length ? critical.join("\n") : "(없음)");

  const pass = critical.length === 0;
  console.log(pass ? "\n✅ Q-1 PASS — getSnapshot 경고 없음" : "\n❌ Q-1 FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
