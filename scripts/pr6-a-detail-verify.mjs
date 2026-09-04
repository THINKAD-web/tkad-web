#!/usr/bin/env node
/**
 * PR6-a — online detail layout, billing labels, mobile quote modal (#538).
 *
 * Usage:
 *   node scripts/pr6-a-detail-verify.mjs
 *   BASE=https://tkad-web-git-feat-….vercel.app VERCEL_SHARE_TOKEN=… node scripts/pr6-a-detail-verify.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  createPreviewBrowserContext,
  primeVercelShareCookie,
  resolvePreviewBase,
  resolveVercelShareToken,
  vercelProtectionBypassHeaders,
} from "./lib/vercel-preview-bypass.mjs";

const RAW_BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const { origin: BASE_ORIGIN, pathPrefix } = resolvePreviewBase(RAW_BASE);
const IS_PREVIEW = BASE_ORIGIN.includes("vercel.app");
const SHARE_TOKEN = resolveVercelShareToken();
const OUT = join(process.cwd(), "reports/pr6-a/step2-dry-run");

const CASES = [
  {
    slug: "ig-awareness-reach",
    kind: "calculable",
    billingExpect: "CPC · CPM",
    priceExpect: "CPC 200~600원 · CPM 4,000~8,000원",
    modalBudget: true,
  },
  {
    slug: "baemin-ad-visit",
    kind: "inquiry-mixed-billing",
    billingExpect: "CPC · 정률 · 정액",
    priceExpect: "가격 문의",
    modalBudget: false,
  },
  {
    slug: "kakao-traffic",
    kind: "calculable",
    billingExpect: "CPC · CPM",
    priceExpect: "CPC 150~450원 · CPM 2,500~5,500원",
    modalBudget: true,
  },
];

const OOH_CHECK = "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";

function mediaPath(slug) {
  const prefix = pathPrefix.startsWith("/ko") ? pathPrefix : "/ko";
  return `${prefix}/media/${slug}`;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function assertNotBlocked(page) {
  const body = await page.locator("body").innerText();
  if (/Authentication Required|Log in to Vercel|Deployment Protection/i.test(body)) {
    throw new Error("deployment-protection-blocked");
  }
}

async function gotoMedia(page, slug) {
  await page.goto(`${BASE_ORIGIN}${mediaPath(slug)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector("h1", { timeout: 90_000 });
  await assertNotBlocked(page);
  await page.waitForTimeout(600);
}

async function verifyOnlineLayout(page, c) {
  await gotoMedia(page, c.slug);

  const body = await page.locator("body").innerText();
  const issues = [];

  if (body.includes("위치 미확인")) issues.push("ooh-map-notice");
  if (body.includes("유동인구")) issues.push("ooh-traffic-tab-label");
  if (body.includes("가용 캘린더")) issues.push("ooh-calendar-tab");
  if (body.includes("집행 검증")) issues.push("ooh-verified-badge");
  if (!body.includes("과금방식") && !body.includes("Billing")) {
    issues.push("spec-table-missing");
  }
  if (!body.includes(c.billingExpect)) {
    issues.push(`billing-mismatch:${c.billingExpect}`);
  }
  if (c.kind.startsWith("calculable")) {
    if (!body.includes("예상 성과")) issues.push("performance-panel-missing");
    if (!body.includes(c.priceExpect)) issues.push("price-missing");
  } else if (!body.includes(c.priceExpect)) {
    issues.push(`inquiry-price:${c.priceExpect}`);
  }

  await page.screenshot({
    path: join(OUT, `desktop-${c.slug}.png`),
    fullPage: false,
  });

  return { slug: c.slug, issues };
}

async function verifyMobileBarAndQuoteModal(page, c) {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoMedia(page, c.slug);

  const bar = page.locator('[aria-label="빠른 문의"], [aria-label="Quick contact"]').first();
  await bar.waitFor({ state: "visible", timeout: 30_000 });

  const barText = await bar.innerText();
  const barIssues = [];
  if (c.kind.startsWith("calculable") && !barText.includes("CPC")) {
    barIssues.push("mobile-bar-no-cpc");
  }
  if (c.kind === "inquiry-mixed-billing" && !barText.includes("가격 문의")) {
    barIssues.push("mobile-bar-not-inquiry");
  }

  const quoteBtn = bar.getByRole("button", { name: /견적받기|Get Quote Now/i });
  if ((await quoteBtn.count()) === 0) {
    barIssues.push("mobile-bar-no-quote-button");
    await page.screenshot({
      path: join(OUT, `mobile-${c.slug}.png`),
      fullPage: false,
    });
    return { slug: c.slug, barText: barText.slice(0, 120), barIssues, modal: null };
  }

  await quoteBtn.click();
  const modalDialog = page.getByRole("dialog", { name: /견적·문의|Quote & contact/i });
  await modalDialog.waitFor({ state: "visible", timeout: 15_000 });

  const modalText = await modalDialog.innerText();
  const modalIssues = [...barIssues];

  if (!modalText.includes("온라인 매체는 문의 또는 MY PLAN")) {
    modalIssues.push("modal-not-online-copy");
  }
  if (!modalText.includes(c.priceExpect.split(" · ")[0])) {
    modalIssues.push(`modal-headline-missing:${c.priceExpect}`);
  }
  if (modalText.includes("견적에 반영할 옵션")) {
    modalIssues.push("modal-ooh-price-options-visible");
  }
  if (modalText.includes("기준 요금")) {
    modalIssues.push("modal-ooh-base-rate-visible");
  }

  const budgetInput = modalDialog.getByLabel("월 예산", { exact: false });
  const hasBudget = (await budgetInput.count()) > 0;
  if (c.modalBudget && !hasBudget) {
    modalIssues.push("modal-budget-field-missing");
  }
  if (!c.modalBudget && hasBudget) {
    modalIssues.push("modal-budget-field-unexpected");
  }

  if (c.modalBudget && hasBudget) {
    await budgetInput.fill("2000000");
    await page.waitForTimeout(300);
    const val = await budgetInput.inputValue();
    if (val !== "2000000") modalIssues.push("modal-budget-input-not-editable");
  }

  const contactBtn = modalDialog.getByRole("link", { name: /^문의하기$|Contact us/i });
  if ((await contactBtn.count()) === 0) {
    modalIssues.push("modal-contact-cta-missing");
  }
  if (modalText.includes("견적 바로 받기")) {
    modalIssues.push("modal-ooh-primary-quote-visible");
  }

  await page.screenshot({
    path: join(OUT, `mobile-modal-${c.slug}.png`),
    fullPage: false,
  });

  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);

  await page.screenshot({
    path: join(OUT, `mobile-${c.slug}.png`),
    fullPage: false,
  });

  return {
    slug: c.slug,
    barText: barText.slice(0, 120),
    barIssues,
    modal: {
      hasBudget,
      headlineSnippet: modalText
        .split("\n")
        .find((l) => l.includes("CPC") || l.includes("가격 문의")) ?? "",
      issues: modalIssues,
    },
  };
}

async function verifyOohRegression(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoMedia(page, OOH_CHECK);
  const body = await page.locator("body").innerText();
  const hasOohTab =
    body.includes("집행") ||
    body.includes("유동인구") ||
    body.includes("위치") ||
    body.includes("Traffic") ||
    body.includes("Execution");
  return { pass: hasOohTab, bodySnippet: body.slice(0, 200) };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await createPreviewBrowserContext(browser, {
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  if (IS_PREVIEW) {
    const prime = await primeVercelShareCookie(page, BASE_ORIGIN, SHARE_TOKEN);
    if (!prime.primed) {
      console.error(
        JSON.stringify(
          {
            pass: false,
            error: "vercel-share-prime-failed",
            prime,
            hint: "Set VERCEL_SHARE_TOKEN or pass --share <token> from get_access_to_vercel_url",
            bypassHeaders: Object.keys(vercelProtectionBypassHeaders()),
          },
          null,
          2,
        ),
      );
      await browser.close();
      process.exit(1);
    }
  }

  const online = {};
  for (const c of CASES) {
    const layout = await verifyOnlineLayout(page, c);
    const mobile = await verifyMobileBarAndQuoteModal(page, c);
    const issues = [
      ...layout.issues,
      ...(mobile.modal?.issues ?? mobile.barIssues ?? []),
    ];
    online[c.slug] = { layout, mobile, issues };
  }
  const ooh = await verifyOohRegression(page);

  await browser.close();

  const allIssues = Object.values(online).flatMap((r) =>
    r.issues.length ? r.issues.map((i) => `${r.layout.slug}:${i}`) : [],
  );

  const report = {
    pass: allIssues.length === 0 && ooh.pass,
    base: BASE_ORIGIN,
    isPreview: IS_PREVIEW,
    sharePrimed: IS_PREVIEW ? Boolean(SHARE_TOKEN) : null,
    online,
    oohRegression: ooh,
    issueCount: allIssues.length,
    issues: allIssues,
    screenshotsDir: OUT,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
