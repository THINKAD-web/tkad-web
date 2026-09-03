#!/usr/bin/env node
/**
 * PR5-c E2E — local-only digital paths (post commit 7).
 *
 * Three paths:
 *   1. Integrated (OOH+Digital brief): budget → mix → report + golden slug UI parity
 *   2. Step planner (commit 5): calculable online handoff → Step 2
 *   3. Home landing: digital tiles from local catalog
 *
 * Usage:
 *   BASE=https://tkad-….vercel.app node --import tsx scripts/pr5-c-force-local-e2e-verify.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  hasOnlinePricingSpec,
  isPublicQuoteWizardSelectableMedia,
} from "../lib/pricing-unavailable.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const LOCALE = `${BASE}/ko`;

const INQUIRY_SLUGS = [
  "meta-advantage-plus",
  "naver-gfa-traffic",
  "kakao-moment-message",
  "youtube-action",
  "google-pmax-conversion",
  "karrot-local-traffic",
  "baemin-ad-visit",
  "app-uai-install",
  "native-taboola-traffic",
];

/** Golden scenario mapped to brief UI (conversion + retail ≈ conversion-retail-8m). */
const GOLDEN = JSON.parse(
  readFileSync(resolve(ROOT, "lib/digital/mix-golden-baseline.json"), "utf8"),
).find((s) => s.id === "conversion-retail-8m");

const PLATFORM_LABELS = {
  meta: /Meta|메타|Facebook|Instagram/i,
  google: /Google|YouTube|유튜브/i,
  naver: /Naver|네이버/i,
  kakao: /Kakao|카카오/i,
  tiktok: /TikTok|틱톡/i,
};

function mixSlugToPlatformId(slug) {
  const s = slug.toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("karrot") || s.includes("daangn")) return "daangn";
  if (s.includes("naver")) return "naver";
  if (s.includes("kakao")) return "kakao";
  if (s.includes("google") || s.includes("youtube")) return "google";
  if (s.includes("meta") || s.includes("instagram") || s.includes("facebook")) {
    return "meta";
  }
  return null;
}

function goldenPlatformIds(slugs) {
  return [...new Set(slugs.map(mixSlugToPlatformId).filter(Boolean))];
}

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
            slugs: body.digital.mix.channels.map((c) => c.media.slug),
            channelCount: body.digital.mix.channels.length,
          });
        }
      } catch {
        /* non-json */
      }
    }
  });
}

async function clearBriefStorage(page) {
  await page.goto(`${LOCALE}/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.evaluate(() => {
    localStorage.removeItem("tkad-planner-brief-v1");
    localStorage.removeItem("tkad_plan_cart");
  });
}

async function switchToDetailed(page) {
  const link = page.getByRole("button", {
    name: /자세히 설계로 전환|Switch to detailed planning/i,
  });
  if ((await link.count()) > 0) {
    await link.click();
    await page.waitForTimeout(400);
  }
}

async function fillDetailedBriefForGolden(page) {
  await page.getByRole("button", { name: "OOH + 디지털" }).click();
  await page.getByRole("button", { name: "전환", exact: true }).click();
  await page.getByRole("button", { name: "유통·리테일", exact: true }).click();

  const budget = page.locator('input[placeholder="3000"]').first();
  await budget.fill("1600");

  const dates = page.locator('input[type="date"]');
  await dates.first().fill("2026-09-01");
  await dates.nth(1).fill("2026-09-30");
}

async function pathIntegratedPlanner(page, mixCaptures) {
  console.log("\n=== Path 1: Integrated planner (OOH+Digital → mix → report) ===");
  await clearBriefStorage(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[placeholder="3000"]', { timeout: 60_000 });
  await switchToDetailed(page);
  await fillDetailedBriefForGolden(page);

  await page.getByRole("button", { name: "다음 · 믹스 편집", exact: true }).click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });
  await page.waitForSelector('[data-testid="brief-digital-panel"]', {
    timeout: 60_000,
  });

  const addBtn = page
    .locator('[data-testid="brief-mix-card-add"]')
    .first();
  assert.ok((await addBtn.count()) > 0, "no OOH mix card to add");
  await addBtn.click();
  await page.waitForTimeout(400);

  await page.waitForSelector('[data-allocation-source="live"]', {
    timeout: 90_000,
  });

  const allocationSource = await page
    .locator("[data-allocation-source]")
    .getAttribute("data-allocation-source");
  assert.equal(
    allocationSource,
    "live",
    "digital allocation must be live (local mix API), not benchmark",
  );

  const catalogSource = await page
    .locator('[data-testid="brief-digital-channel-grid"]')
    .getAttribute("data-catalog-source");
  assert.equal(catalogSource, "live", "catalog meta must be live (local DB)");

  assert.ok(mixCaptures.length > 0, "POST /api/integrated/mix never fired");
  const mix = mixCaptures[mixCaptures.length - 1];
  assert.equal(mix.status, 200, "mix API must return 200");

  const expectedSlugs = [...GOLDEN.slugs].sort();
  const actualSlugs = [...mix.slugs].sort();
  assert.deepEqual(
    actualSlugs,
    expectedSlugs,
    `golden slug parity (conversion-retail-8m)\nexpected: ${expectedSlugs.join(", ")}\nactual:   ${actualSlugs.join(", ")}`,
  );
  console.log(
    `[PASS] mix API golden slugs (${mix.channelCount}): ${actualSlugs.join(", ")}`,
  );

  const gridText = await page
    .locator('[data-testid="brief-digital-channel-grid"]')
    .innerText();
  const expectedPlatforms = goldenPlatformIds(GOLDEN.slugs);
  for (const pid of expectedPlatforms) {
    const pattern = PLATFORM_LABELS[pid];
    assert.ok(pattern, `unknown platform ${pid}`);
    assert.match(
      gridText,
      pattern,
      `digital channel grid must show ${pid} for golden slugs`,
    );
  }
  console.log(
    `[PASS] UI grid shows platforms: ${expectedPlatforms.join(", ")}`,
  );

  assert.ok(
    (await page.locator('[data-testid="brief-digital-benchmark-note"]').count()) ===
      0,
    "benchmark fallback note must not appear after commit 7",
  );

  await page.locator('[data-testid="brief-step-two-next"]').click();
  await page.waitForSelector('[data-testid="brief-result-summary"]', {
    timeout: 60_000,
  });
  console.log("[PASS] Step 3 report rendered (brief-result-summary)");
}

async function pathStepPlanner(page) {
  console.log("\n=== Path 2: Step planner (commit 5 handoff gates) ===");
  const onlineRows = await fetchOnlineRows();
  const calculable = onlineRows.find((r) =>
    isPublicQuoteWizardSelectableMedia(r),
  );
  const inquiry = onlineRows.find(
    (r) => r.slug && INQUIRY_SLUGS.includes(r.slug),
  );
  assert.ok(calculable, "no calculable online in catalog");
  assert.ok(inquiry, "no inquiry slug in catalog");

  await clearBriefStorage(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 60_000 });

  const quickMode = page.locator('[data-entry-mode="quick"]');
  if ((await quickMode.count()) > 0) {
    await quickMode.click();
  }

  const budget = page.locator('input[inputmode="numeric"]').first();
  await budget.click();
  await budget.fill("5000");
  await budget.press("Tab");
  await page.waitForTimeout(600);

  const step1Text = await page.locator("body").innerText();
  assert.ok(
    !step1Text.includes(inquiry.name),
    `Step 1 must not list inquiry: ${inquiry.name}`,
  );
  console.log(`[PASS] Step 1 — inquiry "${inquiry.name}" absent from quick-rank`);

  const nextBtn = page.getByRole("button", {
    name: "다음 · 믹스 편집",
    exact: true,
  });
  await page.waitForFunction(
    (btn) => btn && !btn.disabled,
    await nextBtn.elementHandle(),
    { timeout: 15_000 },
  );
  await nextBtn.click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });

  const mixCard = page
    .locator('[data-testid="brief-mix-card-row"]')
    .filter({ hasText: calculable.name })
    .first();

  if ((await mixCard.count()) > 0) {
    await mixCard.getByRole("button", { name: /믹스에 추가|Add to mix/i }).click();
    console.log(`[PASS] Step 2 — calculable "${calculable.name}" addable from cards`);
  } else {
    await page.goto(
      `${LOCALE}/planner?addMedia=${encodeURIComponent(calculable.id)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await page.waitForSelector('[data-testid="brief-mix-list"]', {
      timeout: 60_000,
    });
    console.log(`[PASS] Step 2 — calculable via handoff deeplink`);
  }

  const mixRow = page.locator('[data-testid="brief-mix-catalog-row"]').filter({
    hasText: calculable.name,
  });
  assert.ok((await mixRow.count()) > 0, "calculable not in Step 2 mix list");

  const next = page.locator('[data-testid="brief-step-two-next"]');
  assert.ok(await next.isEnabled(), "Step 2 next enabled with online in mix");

  await page.evaluate(() => localStorage.removeItem("tkad-planner-brief-v1"));
  await page.goto(
    `${LOCALE}/planner?mediaIds=${encodeURIComponent(calculable.id)},${encodeURIComponent(inquiry.id)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 60_000 });

  const mixNames = await page
    .locator('[data-testid="brief-mix-catalog-row"]')
    .allInnerTexts();
  assert.ok(mixNames.some((t) => t.includes(calculable.name)));
  assert.ok(!mixNames.some((t) => t.includes(inquiry.name)));
  console.log("[PASS] deeplink handoff — calculable in mix, inquiry blocked");
}

async function pathHomeDigitalTiles(page) {
  console.log("\n=== Path 3: Home landing digital tiles ===");
  await page.goto(`${LOCALE}`, { waitUntil: "domcontentloaded", timeout: 120_000 });

  const coverage = page.locator("#home-planner-coverage");
  await coverage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const digitalSection = coverage.locator('a[href*="/media/online"]');
  const count = await digitalSection.count();
  assert.ok(count >= 3, `expected ≥3 digital tiles, got ${count}`);

  const texts = await digitalSection.allInnerTexts();
  const withCount = texts.filter((t) => /\d+/.test(t));
  assert.ok(
    withCount.length >= 2,
    "digital tiles should show local catalog counts",
  );

  console.log(`[PASS] home digital tiles: ${count} links, counts visible`);
}

async function main() {
  const health = await fetch(`${LOCALE}/planner`, { cache: "no-store" }).catch(
    () => null,
  );
  if (!health?.ok) {
    console.error(`[FAIL] server not reachable at ${BASE}`);
    process.exit(1);
  }

  const onlineRows = await fetchOnlineRows();
  const calculableCount = onlineRows.filter((r) =>
    hasOnlinePricingSpec(r),
  ).length;
  console.log(
    `[info] BASE=${BASE} online calculable=${calculableCount} inquiry slugs=${INQUIRY_SLUGS.filter((s) => onlineRows.some((r) => r.slug === s)).length}`,
  );

  const mixCaptures = [];
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  attachMixCapture(page, mixCaptures);

  const results = { pass: true, base: BASE, paths: {} };

  try {
    await pathIntegratedPlanner(page, mixCaptures);
    results.paths.integrated = { pass: true, golden: GOLDEN.id, slugs: GOLDEN.slugs };

    await pathStepPlanner(page);
    results.paths.stepPlanner = { pass: true };

    await pathHomeDigitalTiles(page);
    results.paths.homeTiles = { pass: true };
  } finally {
    await browser.close();
  }

  console.log("\n" + JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
