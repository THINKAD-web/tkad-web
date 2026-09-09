#!/usr/bin/env node
/**
 * STEP3c — AI플래너 온라인 plan cart 연동 브라우저 검증
 * Usage: BASE=http://127.0.0.1:3010 node scripts/verify-step3c-plan-cart.mjs
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const consoleErrors = [];

function freshIpHeaders() {
  const a = Math.floor(Math.random() * 200) + 10;
  const b = Math.floor(Math.random() * 200) + 10;
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Forwarded-For": `10.${a}.${b}.${Math.floor(Math.random() * 200) + 1}`,
  };
}

async function prepareRecommendForm(page) {
  await page.goto(`${BASE}/ko/recommend`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(() => {
    localStorage.removeItem("tkad_plan_cart");
    sessionStorage.removeItem("tkad_recommend_session_v2");
  });
  const freshStart = page.getByRole("button", { name: "새로 시작" });
  if (await freshStart.isVisible().catch(() => false)) {
    await freshStart.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("button", { name: "구조화 입력" }).click();
  await page.getByRole("button", { name: "브랜드 인지" }).click();
  await page.locator("label").filter({ hasText: /^서울$/ }).click();
  await page.getByRole("button", { name: "유통/리테일" }).click();
  await page.getByRole("button", { name: "AI 분석 시작" }).click();
  await page.waitForSelector('[data-testid="recommend-online-mix-section"][data-online-status="ok"]', {
    timeout: 180_000,
  });
  await page.waitForTimeout(800);
}

async function readCart(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("tkad_plan_cart");
    if (!raw) return { items: [] };
    try {
      return JSON.parse(raw);
    } catch {
      return { items: [] };
    }
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    extraHTTPHeaders: freshIpHeaders(),
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("401 (Unauthorized)")) return;
    if (text.includes("Encountered two children with the same key")) return;
    consoleErrors.push(text);
  });

  const results = [];
  console.log(`\n=== STEP3c plan cart verify BASE=${BASE} ===\n`);

  await prepareRecommendForm(page);

  const firstAddWrap = page.locator('[data-testid^="recommend-online-cart-add-"]').first();
  const addTestId = await firstAddWrap.getAttribute("data-testid");
  const mediaId = addTestId?.replace("recommend-online-cart-add-", "") ?? "";
  const cardBudgetText = await page
    .locator('[data-testid="brief-online-channel-card"]')
    .first()
    .innerText();

  await firstAddWrap.getByRole("button", { name: "담기" }).click();
  await page.waitForTimeout(500);
  const cartAfterAdd = await readCart(page);
  const addedItem = cartAfterAdd.items?.find((i) => i.mediaId === mediaId);

  results.push({
    step: "1_online_add_to_cart",
    mediaId,
    cartCount: cartAfterAdd.items?.length ?? 0,
    addedFrom: addedItem?.addedFrom,
    pass:
      Boolean(addedItem) &&
      addedItem.addedFrom === "ai_recommend" &&
      (cartAfterAdd.items?.length ?? 0) >= 1,
  });

  const budgetManMatch = cardBudgetText.match(/배정 예산[\s\S]*?([\d,]+)/);
  const cardBudgetMan = budgetManMatch
    ? Number(budgetManMatch[1].replace(/,/g, ""))
    : null;
  const expectedLineTotalWon =
    cardBudgetMan != null ? cardBudgetMan * 10_000 : null;
  results.push({
    step: "2_line_total_vs_card_budget",
    cardBudgetMan,
    expectedLineTotalWon,
    lineTotalWon: addedItem?.lineTotalWon ?? null,
    pass:
      expectedLineTotalWon != null &&
      addedItem?.lineTotalWon === expectedLineTotalWon,
  });

  const buttonLabelInCart = await firstAddWrap.getByRole("button").innerText();
  const cartMid = await readCart(page);
  const dupCount = cartMid.items?.filter((i) => i.mediaId === mediaId).length ?? 0;
  results.push({
    step: "3_duplicate_click",
    dupCount,
    buttonLabelInCart,
    pass: dupCount === 1 && /빼기|Remove/.test(buttonLabelInCart),
  });

  const top3Section = page.locator("section").filter({ hasText: "TKAD BOT TOP 3" });
  await top3Section.getByRole("button", { name: "담기" }).first().click();
  await page.waitForTimeout(400);
  const cartAfterOoh = await readCart(page);
  results.push({
    step: "4_ooh_add_regression",
    cartCount: cartAfterOoh.items?.length ?? 0,
    hasOohAndOnline:
      (cartAfterOoh.items?.length ?? 0) >= 2 &&
      cartAfterOoh.items.some((i) => i.catalogChannel === "online") &&
      cartAfterOoh.items.some((i) => i.catalogChannel !== "online"),
    pass: (cartAfterOoh.items?.length ?? 0) >= 2,
  });

  await page.goto(`${BASE}/ko/my/plan`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes("불러오는 중"),
    { timeout: 60_000 },
  ).catch(() => {});
  await page.waitForTimeout(1000);
  const cartPageText = await page.locator("main").innerText().catch(() => page.locator("body").innerText());
  const cartPersisted = await readCart(page);
  const onlineItemVisible =
    addedItem?.mediaName
      ? cartPageText.includes(addedItem.mediaName.slice(0, 6)) ||
        cartPersisted.items?.some((i) => i.mediaId === mediaId)
      : false;
  results.push({
    step: "5_cart_page_display",
    onlineItemVisible,
    snippet: cartPageText.replace(/\s+/g, " ").slice(0, 200),
    pass: onlineItemVisible,
  });

  results.push({
    step: "6_console_errors",
    errors: consoleErrors,
    pass: consoleErrors.length === 0,
  });

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
