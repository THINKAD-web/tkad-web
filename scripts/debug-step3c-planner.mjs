#!/usr/bin/env node
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const BASE = "http://127.0.0.1:3010";
const session = JSON.parse(
  execSync(
    `npx tsx -e "(async()=>{const { createUserSessionToken, createSessionRecord, USER_SESSION_COOKIE }=await import('./lib/user-session.ts');const userId='cmo6th4ef000004l4bjb4tj87';const token=createUserSessionToken(userId,'USER');await createSessionRecord({ userId, token });console.log(JSON.stringify({ name: USER_SESSION_COOKIE, value: token }));})()"`,
    { encoding: "utf8" },
  ).trim(),
);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: "ko-KR" });
await ctx.addCookies([{ ...session, domain: "127.0.0.1", path: "/" }]);
const page = await ctx.newPage();
await mkdir("tmp", { recursive: true });

await page.goto(`${BASE}/ko/planner?new=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(1000);
if (await page.getByText("이전에 담아두신").isVisible().catch(() => false)) {
  await page.getByRole("button", { name: "새로 시작" }).click();
}
await page.locator('[data-entry-mode="detailed"]').click();
await page.getByRole("button", { name: "전환", exact: true }).click();
await page.locator('input[inputmode="numeric"]').first().fill("1667");
const dates = page.locator('input[type="date"]');
console.log("date inputs", await dates.count());
if ((await dates.count()) >= 2) {
  await dates.nth(0).fill("2026-09-01");
  await dates.nth(1).fill("2026-09-30");
}
const next1 = page.getByRole("button", { name: "다음 · 믹스 편집", exact: true });
console.log("step1 next disabled", await next1.isDisabled());
await next1.click();
await page.waitForTimeout(4000);
console.log("url after step1", page.url());
console.log("mix list", await page.locator('[data-testid="brief-mix-list"]').count());
const mixAdd = page.locator('[data-testid="brief-mix-card-add"]');
console.log("mix add count", await mixAdd.count());
if (await mixAdd.count()) await mixAdd.first().click();
await page.waitForTimeout(1500);
const step2next = page.locator('[data-testid="brief-step-two-next"]');
console.log("step2 next disabled", await step2next.isDisabled());
console.log("step2 next text", await step2next.innerText().catch(() => ""));
await step2next.click();
await page.waitForTimeout(8000);
console.log("url after step2", page.url());
console.log("summary", await page.locator('[data-testid="brief-result-summary"]').count());
console.log("preview", await page.locator('[data-testid="brief-proposal-preview"]').count());
console.log("main snippet:", (await page.locator("main").innerText()).slice(0, 800));
await page.screenshot({ path: "tmp/step3c-debug.png", fullPage: true });
await browser.close();
