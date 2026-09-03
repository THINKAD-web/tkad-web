#!/usr/bin/env node
/**
 * PR5-b wizard Preview — price-null search + mixed cart Step 2.
 * Usage: BASE='https://...vercel.app/ko/quote?_vercel_share=...' node scripts/pr5-b-wizard-preview-verify.mjs
 */
import { chromium } from "playwright";

const BASE =
  process.env.BASE ??
  "https://tkad-web-git-feat-pr5-b-gate-release-mannote-6701s-projects.vercel.app/ko/quote";

const MIXED_NOTICE_KO =
  "OOH 매체는 아래 집행 기간 기준, 온라인 매체는 라인별 월 예산으로 견적됩니다.";

async function waitForCatalog(page) {
  await page.waitForFunction(
    () =>
      document.querySelectorAll('button[aria-label$="선택"]').length > 0 ||
      document.body.innerText.includes("조건에 맞는 매체가 없습니다"),
    { timeout: 90_000 },
  );
}

async function openPriceFilters(page) {
  const filterBtn = page.locator("button").filter({ hasText: /^필터$/ }).first();
  await filterBtn.scrollIntoViewIfNeeded();
  await filterBtn.click({ force: true });
  await page.waitForTimeout(600);
  const more = page.getByText("추가 필터");
  if (await more.isVisible({ timeout: 3000 }).catch(() => false)) {
    await more.click();
    await page.waitForTimeout(500);
  }
}

async function applyFilterSheet(page) {
  const apply = page.getByRole("button", { name: /^적용/ }).first();
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(600);
  }
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
}

async function setPriceMin(page, won) {
  await openPriceFilters(page);
  const minLabel = page.getByText("최소 가격(원)");
  await minLabel.waitFor({ state: "visible", timeout: 15_000 });
  const minInput = minLabel.locator("..").locator('input[type="number"]');
  await minInput.fill(String(won));
  await applyFilterSheet(page);
  await page.waitForTimeout(600);
}

async function clearPriceFilters(page) {
  await openPriceFilters(page);
  const allPreset = page.getByRole("button", { name: "전체" }).first();
  if (await allPreset.isVisible({ timeout: 3000 }).catch(() => false)) {
    await allPreset.click();
    await page.waitForTimeout(300);
  }
  await applyFilterSheet(page);
}

async function searchQuery(page, q) {
  const search = page.locator('input[placeholder*="매체명"]').nth(1);
  await search.waitFor({ state: "attached", timeout: 15_000 });
  await search.click({ force: true });
  await search.fill(q);
  await page.waitForTimeout(900);
}

function countSelectButtons(page, pattern) {
  return page.evaluate((reSource) => {
    const re = new RegExp(reSource, "i");
    return [...document.querySelectorAll("button[aria-label]")].filter((b) =>
      re.test(b.getAttribute("aria-label") ?? ""),
    ).length;
  }, pattern.source);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 960 } });

  console.log("=== PR5-b wizard Preview verify ===");
  console.log(`BASE=${BASE}`);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(5000);
  await waitForCatalog(page);

  // 1) Price chip ON + 구글 → 4 online
  await setPriceMin(page, 1_000_000);
  await searchQuery(page, "구글");
  const googleWithPrice = await countSelectButtons(page, /구글.*선택/);
  const emptyWithPrice = await page
    .getByText("조건에 맞는 매체가 없습니다")
    .isVisible()
    .catch(() => false);
  console.log(
    `[1] price min 1M + 구글: google cards=${googleWithPrice} empty=${emptyWithPrice}`,
  );

  // 2) Price OFF + offline search (fresh page — filter sheet from [1] can block toolbar)
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(4000);
  await waitForCatalog(page);
  await searchQuery(page, "강남");
  const gangnam = await countSelectButtons(page, /강남.*선택/);
  const emptyGangnam = await page
    .getByText("조건에 맞는 매체가 없습니다")
    .isVisible()
    .catch(() => false);
  console.log(
    `[2] no price chip + 강남: cards=${gangnam} empty=${emptyGangnam}`,
  );

  // 3) Mixed cart Step 2
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(4000);
  await waitForCatalog(page);
  await searchQuery(page, "");
  await page.waitForTimeout(500);

  const oohBtn = page
    .getByRole("button", { name: /명동.*선택|여의도.*선택|강남.*선택/ })
    .first();
  await oohBtn.waitFor({ state: "visible", timeout: 30_000 });
  const oohLabel = await oohBtn.getAttribute("aria-label");
  await oohBtn.click();
  await page.waitForTimeout(400);

  await searchQuery(page, "구글 검색광고");
  const onlineBtn = page
    .getByRole("button", { name: /구글 검색광고.*선택/ })
    .first();
  await onlineBtn.waitFor({ state: "visible", timeout: 15_000 });
  await onlineBtn.click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /^다음$/ }).click({ force: true });
  await page.waitForTimeout(1200);

  const mixedNotice = await page.getByText(MIXED_NOTICE_KO).isVisible();
  const periodUi = await page.getByText("[ 광고 기간 ]").isVisible();
  const onlineBudgetUi = await page.getByText("[ 온라인 월 예산 ]").isVisible();
  const periodSelect = await page.locator('select[aria-label="광고 기간"]').isVisible();
  const layoutStacked = await page.evaluate(() => {
    const period = [...document.querySelectorAll("*")].find((el) =>
      el.textContent?.trim() === "[ 광고 기간 ]",
    );
    const budget = [...document.querySelectorAll("*")].find((el) =>
      el.textContent?.trim() === "[ 온라인 월 예산 ]",
    );
    if (!period || !budget) return false;
    const pr = period.getBoundingClientRect();
    const br = budget.getBoundingClientRect();
    return pr.bottom <= br.top + 4;
  });

  console.log(`[3] mixed cart notice: ${mixedNotice}`);
  console.log(`[3] OOH period UI: ${periodUi}, period select: ${periodSelect}, online budget UI: ${onlineBudgetUi}`);
  console.log(`[3] layout stacked (period above budget): ${layoutStacked}`);
  console.log(`[3] picked OOH: ${oohLabel}`);

  const pass =
    googleWithPrice >= 4 &&
    !emptyWithPrice &&
    gangnam >= 1 &&
    !emptyGangnam &&
    mixedNotice &&
    periodUi &&
    periodSelect &&
    onlineBudgetUi &&
    layoutStacked;

  console.log(pass ? "PASS wizard Preview verify" : "FAIL wizard Preview verify");
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
