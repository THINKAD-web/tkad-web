#!/usr/bin/env node
/**
 * PR5-c step 6 — six-surface integrated handoff (single session).
 *
 * Flow:
 *   browse/compare → quote wizard → plan cart → brief planner → integrated mix
 *   + inquiry blocked at each gate
 *
 * Usage:
 *   BASE=https://tkad-….vercel.app node --import tsx scripts/pr5-c-six-surface-integrated-verify.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  canAddMediaToPlanCart,
  hasOnlinePricingSpec,
  isPublicQuoteWizardSelectableMedia,
} from "../lib/pricing-unavailable.ts";
import { e2eMixBypassHeaders } from "./lib/e2e-mix-bypass.mjs";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const LOCALE = `${BASE}/ko`;

const INQUIRY_SLUGS = [
  "meta-advantage-plus",
  "naver-gfa-traffic",
  "naver-brand-search",
  "kakao-moment-message",
  "youtube-action",
  "google-pmax-conversion",
  "karrot-local-traffic",
  "baemin-ad-visit",
  "coupang-ad-traffic",
  "app-uai-install",
  "native-taboola-traffic",
];

const log = {
  pass: (msg) => console.log(`[PASS] ${msg}`),
  step: (n, msg) => console.log(`\n=== Step ${n}: ${msg} ===`),
  info: (msg) => console.log(`[info] ${msg}`),
};

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function fetchOnlineRows() {
  const res = await fetch(
    `${BASE}/api/public/media?catalogChannel=online&limit=50`,
    { cache: "no-store" },
  );
  assert.ok(res.ok, `online API ${res.status}`);
  const json = await res.json();
  return json.data ?? json.media ?? [];
}

function pickFixtures(rows) {
  const calculable = rows.filter((r) => isPublicQuoteWizardSelectableMedia(r));
  const inquiry = rows.find((r) => r.slug && INQUIRY_SLUGS.includes(r.slug));
  const primary =
    calculable.find((r) => r.slug === "google-ads-search") ?? calculable[0];
  const secondary =
    calculable.find((r) => r.id !== primary?.id && r.slug?.includes("naver")) ??
    calculable.find((r) => r.id !== primary?.id) ??
    primary;
  assert.ok(primary, "no calculable online media");
  assert.ok(inquiry, "no inquiry slug in catalog");
  assert.ok(calculable.length >= 14, `expected ≥14 calculable, got ${calculable.length}`);
  return { calculable, inquiry, primary, secondary };
}

async function clearSessionStorage(page) {
  await page.goto(`${LOCALE}/media/online`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.evaluate(() => {
    localStorage.removeItem("tkad-planner-brief-v1");
    localStorage.removeItem("tkad_plan_cart");
    localStorage.removeItem("tkad-compare-cart-v1");
  });
}

async function step1BrowseCompareAdd(page, primary, inquiry) {
  log.step(1, "Browse → compare add (calculable)");
  await clearSessionStorage(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('button[aria-label*="비교"], button[aria-label*="Compare"]').length >
        0 ||
      document.body.innerText.includes("조건에 맞는 매체가 없습니다"),
    { timeout: 90_000 },
  );

  const primaryCard = page.locator("a").filter({ hasText: primary.name }).first();
  await primaryCard.waitFor({ state: "visible", timeout: 60_000 });
  const compareBtn = primaryCard.getByRole("button", {
    name: /비교|Compare/i,
  });
  await compareBtn.click({ force: true });
  await page.waitForTimeout(500);

  const compareCart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tkad-compare-cart-v1") ?? "[]"),
  );
  assert.ok(
    compareCart.some((e) => e.id === primary.id),
    "calculable not in compare cart after browse toggle",
  );
  log.pass(`browse compare toggle — ${primary.name} in compare cart`);

  log.step("1b", "Inquiry compare add (allowed in cart, inquiry label on compare page)");
  const inquiryCard = page.locator("a").filter({ hasText: inquiry.name }).first();
  if ((await inquiryCard.count()) > 0) {
    const inquiryCompare = inquiryCard.getByRole("button", {
      name: /비교|Compare/i,
    });
    await inquiryCompare.click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function fetchOohCalculable() {
  const res = await fetch(`${BASE}/api/public/media?limit=80`, {
    cache: "no-store",
  });
  assert.ok(res.ok, `catalog API ${res.status}`);
  const json = await res.json();
  const rows = json.data ?? json.media ?? [];
  return (
    rows.find(
      (r) =>
        r.catalogChannel !== "online" &&
        r.price != null &&
        Number(r.price) > 0 &&
        r.type?.trim(),
    ) ?? null
  );
}

async function step2Compare14(page, calculable, inquiry) {
  log.step(2, `Compare page — ${calculable.length} calculable rows`);
  const ids = calculable.map((r) => r.id).join(",");
  await page.goto(`${LOCALE}/compare?ids=${encodeURIComponent(ids)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () => {
      const t = document.body.innerText;
      return t.includes("14") && (t.includes("비교") || t.includes("compare"));
    },
    { timeout: 90_000 },
  );

  const body = await page.locator("body").innerText();
  assert.match(body, /14/, "compare results count should show 14");
  assert.ok(
    body.includes(primaryNameHint(calculable[0])),
    "primary calculable visible on compare",
  );

  const compareRes = await fetch(
    `${LOCALE}/compare?ids=${encodeURIComponent(ids)}`,
    { cache: "no-store" },
  );
  const compareHtml = await compareRes.text();
  assert.match(
    compareHtml,
    /월 예산|Online monthly budget|인스턴트 견적|Instant quote/i,
    "compare SSR includes budget/quote section",
  );

  const calculableWithBudget = calculable.filter((r) => hasOnlinePricingSpec(r));
  assert.equal(
    calculableWithBudget.length,
    calculable.length,
    "all calculable rows have pricing spec",
  );
  log.pass(`compare loaded ${calculable.length} calculable — budget/compare UI present`);

  await page.goto(
    `${LOCALE}/compare?ids=${encodeURIComponent(`${calculable[0].id},${inquiry.id}`)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForFunction(
    () => document.body.innerText.length > 500,
    { timeout: 60_000 },
  );
  const mixedText = await page.locator("body").innerText();
  assert.match(mixedText, /가격 문의|Price inquiry|문의/i, "inquiry row shows inquiry label");
  log.pass("compare mixed — inquiry shows 가격 문의, calculable present");
}

function primaryNameHint(row) {
  return row.name.split(/[\s(]/)[0].slice(0, 4);
}

async function step3QuoteWizard(page, primary, inquiry, ooh) {
  log.step(3, "Quote wizard — calculable + OOH → Step 2 mixed cart hint");
  const mediaIds = ooh ? `${ooh.id},${primary.id}` : primary.id;
  await page.goto(`${LOCALE}/quote?media=${encodeURIComponent(mediaIds)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);

  const step2Btn = page.locator(".tkad-quote-wizard-step-btn").nth(1);
  await step2Btn.click();
  await page.waitForTimeout(1000);

  const step2Text = await page.locator("body").innerText();
  if (ooh) {
    assert.match(
      step2Text,
      /OOH 매체는 아래 집행 기간|online lines use per-media monthly/i,
      "mixed OOH+online Step 2 guidance",
    );
    log.pass("wizard Step 2 — mixed cart OOH+online hint");
  }
  assert.match(step2Text, /온라인 월 예산|Online monthly budget/i);
  log.pass("wizard Step 2 — online monthly budget section");

  await page.goto(
    `${LOCALE}/quote?media=${encodeURIComponent(inquiry.id)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForTimeout(1500);
  const step2Probe = page.locator(".tkad-quote-wizard-step-btn").nth(1);
  await step2Probe.click();
  await page.waitForTimeout(600);
  const deeplinkBody = await page.locator("body").innerText();
  assert.ok(
    !deeplinkBody.includes("온라인 월 예산"),
    "inquiry-only deeplink must not open online budget Step 2",
  );
  assert.match(
    deeplinkBody,
    /매체|media|선택|선택해|Select/i,
    "wizard prompts media selection when inquiry deeplink filtered",
  );
  log.pass("wizard — inquiry deeplink blocked (no selection / no budget step)");
}

async function step4PlanCartPersist(page, primary, inquiry) {
  log.step(4, "Plan cart — save, reload, lineTotalWon persists");
  assert.equal(
    canAddMediaToPlanCart(inquiry),
    false,
    "inquiry online must fail canAddMediaToPlanCart gate",
  );
  log.pass("plan cart gate — inquiry blocked (unit)");
  await page.evaluate(() => localStorage.removeItem("tkad_plan_cart"));
  await page.goto(`${LOCALE}/media/online`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('button[aria-label*="담기"], button[aria-label*="Add"]').length >
        0,
    { timeout: 90_000 },
  );

  const card = page.locator("a").filter({ hasText: primary.name }).first();
  const addBtn = card.getByRole("button", {
    name: /담은 매체에 담기|Add to plan/i,
  });
  await addBtn.click({ force: true });
  await page.waitForTimeout(800);

  const beforeReload = await page.evaluate(() => {
    const raw = localStorage.getItem("tkad_plan_cart");
    return raw ? JSON.parse(raw) : null;
  });
  const item = beforeReload?.items?.find((i) => i.mediaId === primary.id);
  assert.ok(item?.lineTotalWon > 0, "lineTotalWon missing after browse add");
  const expectedMin = primary.onlineSpec?.minBudget ?? 1_000_000;
  assert.equal(item.lineTotalWon, expectedMin, "lineTotalWon ≠ minBudget default");
  log.pass(`plan cart add — lineTotalWon=${item.lineTotalWon}`);

  await page.goto(`${LOCALE}/my/plan`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  const afterReload = await page.evaluate(() => {
    const raw = localStorage.getItem("tkad_plan_cart");
    return raw ? JSON.parse(raw) : null;
  });
  const persisted = afterReload?.items?.find((i) => i.mediaId === primary.id);
  assert.equal(
    persisted?.lineTotalWon,
    item.lineTotalWon,
    "lineTotalWon lost after /my/plan reload",
  );
  log.pass("plan cart reload — lineTotalWon persisted");

  await page.goto(`${LOCALE}/media/online`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('button[aria-label*="담기"], button[aria-label*="Add"]').length >
        0,
    { timeout: 90_000 },
  );
  const inquiryCard = page.locator("a").filter({ hasText: inquiry.name }).first();
  if ((await inquiryCard.count()) > 0) {
    const inquiryAdd = inquiryCard.getByRole("button", {
      name: /담은 매체에 담기|Add to plan/i,
    });
    await inquiryAdd.click({ force: true });
    await page.waitForTimeout(600);
    const cartAfterInquiry = await page.evaluate(() => {
      const raw = localStorage.getItem("tkad_plan_cart");
      return raw ? JSON.parse(raw) : null;
    });
    assert.ok(
      !cartAfterInquiry?.items?.some((i) => i.mediaId === inquiry.id),
      "inquiry leaked into plan cart",
    );
    log.pass("plan cart — inquiry add blocked");
  }
}

async function step5BriefHandoff(page, primary) {
  log.step(5, "Plan cart → brief handoff (?from=plan)");
  const href = `${LOCALE}/planner?from=plan&mediaIds=${encodeURIComponent(primary.id)}`;
  await page.goto(href, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 90_000 });

  const mixRow = page.locator('[data-testid="brief-mix-catalog-row"]').filter({
    hasText: primary.name,
  });
  assert.ok((await mixRow.count()) > 0, "plan handoff — calculable not in Step 2 mix");
  log.pass(`brief handoff — ${primary.name} in mix from plan cart`);

  const url = page.url();
  assert.ok(!url.includes("from=plan"), "handoff query consumed from URL");
  log.pass("handoff query params consumed");
}

async function step6IntegratedMix(page, primary, secondary, mixCaptures) {
  log.step(6, "Integrated planner (OOH+Digital) — digital allocation");
  await page.evaluate(() => localStorage.removeItem("tkad-planner-brief-v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[placeholder="3000"]', { timeout: 60_000 });

  const detailed = page.getByRole("button", {
    name: /자세히 설계로 전환|Switch to detailed planning/i,
  });
  if ((await detailed.count()) > 0) {
    await detailed.click();
    await page.waitForTimeout(400);
  }

  await page.getByRole("button", { name: "OOH + 디지털" }).click();
  await page.getByRole("button", { name: "전환", exact: true }).click();
  await page.getByRole("button", { name: "유통·리테일", exact: true }).click();

  const budget = page.locator('input[placeholder="3000"]').first();
  await budget.fill("1600");
  const dates = page.locator('input[type="date"]');
  await dates.first().fill("2026-09-01");
  await dates.nth(1).fill("2026-09-30");

  await page.getByRole("button", { name: "다음 · 믹스 편집", exact: true }).click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });
  await page.waitForSelector('[data-testid="brief-digital-panel"]', {
    timeout: 60_000,
  });

  const addOoh = page.locator('[data-testid="brief-mix-card-add"]').first();
  if ((await addOoh.count()) > 0) {
    await addOoh.click();
    await page.waitForTimeout(400);
  }

  await page.waitForSelector('[data-allocation-source="live"]', {
    timeout: 90_000,
  });
  const allocationSource = await page
    .locator("[data-allocation-source]")
    .getAttribute("data-allocation-source");
  assert.equal(allocationSource, "live");
  assert.ok(mixCaptures.length > 0, "POST /api/integrated/mix never fired");
  assert.equal(mixCaptures.at(-1).status, 200);

  const catalogSource = await page
    .locator('[data-testid="brief-digital-channel-grid"]')
    .getAttribute("data-catalog-source");
  assert.equal(catalogSource, "live");

  assert.ok(
    (await page.locator('[data-testid="brief-digital-benchmark-note"]').count()) === 0,
    "benchmark fallback note must not appear",
  );
  log.pass(
    `integrated mix — live allocation, ${mixCaptures.at(-1).channelCount} channels`,
  );

  if (secondary && secondary.id !== primary?.id) {
    await page.goto(
      `${LOCALE}/planner?addMedia=${encodeURIComponent(secondary.id)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });
    const secRow = page.locator('[data-testid="brief-mix-catalog-row"]').filter({
      hasText: secondary.name,
    });
    if ((await secRow.count()) > 0) {
      log.pass(`addMedia handoff — ${secondary.name} in mix`);
    }
  }
}

async function step7InquiryBriefBlock(page, calculable, inquiry) {
  log.step(7, "Inquiry blocked in brief handoff deeplink");
  await page.evaluate(() => localStorage.removeItem("tkad-planner-brief-v1"));
  const calc = calculable[0];
  await page.goto(
    `${LOCALE}/planner?mediaIds=${encodeURIComponent(`${calc.id},${inquiry.id}`)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });
  const mixNames = await page
    .locator('[data-testid="brief-mix-catalog-row"]')
    .allInnerTexts();
  assert.ok(mixNames.some((t) => t.includes(calc.name)));
  assert.ok(!mixNames.some((t) => t.includes(inquiry.name)));
  log.pass("brief deeplink — calculable in mix, inquiry blocked");
}

function attachMixCapture(page, bucket) {
  page.on("response", async (res) => {
    if (
      res.request().method() === "POST" &&
      res.url().includes("/api/integrated/mix")
    ) {
      try {
        const body = await res.json();
        if (body?.digital?.mix?.channels) {
          bucket.push({
            status: res.status(),
            channelCount: body.digital.mix.channels.length,
            slugs: body.digital.mix.channels.map((c) => c.media.slug),
          });
        }
      } catch {
        /* ignore */
      }
    }
  });
}

async function main() {
  const health = await fetch(`${LOCALE}/planner`, { cache: "no-store" }).catch(
    () => null,
  );
  if (!health?.ok) {
    console.error(`[FAIL] server not reachable at ${BASE}`);
    process.exit(1);
  }

  const rows = await fetchOnlineRows();
  const ooh = await fetchOohCalculable();
  const { calculable, inquiry, primary, secondary } = pickFixtures(rows);
  log.info(
    `BASE=${BASE} calculable=${calculable.length} primary=${primary.slug} inquiry=${inquiry.slug} ooh=${ooh?.name ?? "none"}`,
  );

  const mixCaptures = [];
  const browser = await launchBrowser();
  const context = await browser.newContext({
    extraHTTPHeaders: e2eMixBypassHeaders(),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  attachMixCapture(page, mixCaptures);

  const results = {
    pass: true,
    base: BASE,
    calculableCount: calculable.length,
    steps: {},
  };

  try {
    await step1BrowseCompareAdd(page, primary, inquiry);
    results.steps.browseCompare = { pass: true, media: primary.slug };

    await step2Compare14(page, calculable, inquiry);
    results.steps.compare14 = { pass: true, count: calculable.length };

    await step3QuoteWizard(page, primary, inquiry, ooh);
    results.steps.quoteWizard = { pass: true };

    await step4PlanCartPersist(page, primary, inquiry);
    results.steps.planCart = {
      pass: true,
      lineTotalWon: primary.onlineSpec?.minBudget,
    };

    await step5BriefHandoff(page, primary);
    results.steps.briefHandoff = { pass: true };

    await step6IntegratedMix(page, primary, secondary, mixCaptures);
    results.steps.integratedMix = {
      pass: true,
      mixChannels: mixCaptures.at(-1)?.channelCount,
    };

    await step7InquiryBriefBlock(page, calculable, inquiry);
    results.steps.inquiryGates = { pass: true };
  } finally {
    await browser.close();
  }

  console.log("\n" + JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
