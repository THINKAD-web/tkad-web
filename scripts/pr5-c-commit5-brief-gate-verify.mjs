#!/usr/bin/env node
/**
 * PR5-c commit 5 — brief online B-plan gate + handoff verify.
 * Usage:
 *   npm run dev   # separate terminal, default :3000
 *   node scripts/pr5-c-commit5-brief-gate-verify.mjs
 *   BASE=http://127.0.0.1:3015 node scripts/pr5-c-commit5-brief-gate-verify.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  hasOnlinePricingSpec,
  isPublicQuoteWizardSelectableMedia,
  quoteWizardSelectBlockedMessage,
} from "../lib/pricing-unavailable.ts";
import {
  planCartToBriefHandoff,
  resolveHandoffMix,
  savedPlannerPlanToBriefHandoff,
} from "../lib/planner/brief/handoff.ts";

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

function mediaFixture(id, extra = {}) {
  return {
    id,
    name: id,
    nameEn: id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    price: 1_000_000,
    dailyFootTraffic: 10_000,
    ...extra,
  };
}

function unitHandoffGates() {
  const offline = mediaFixture("ooh-a");
  const calculable = mediaFixture("calc-1", {
    catalogChannel: "online",
    type: null,
    price: null,
    regionMain: "online",
    region: "online",
    onlineSpec: {
      platform: "Meta",
      minBudget: 500_000,
      cpcMin: 100,
      cpcMax: 300,
      cpmMin: 3000,
      cpmMax: 6000,
    },
  });
  const inquiry = mediaFixture("inq-1", {
    catalogChannel: "online",
    type: null,
    price: null,
    regionMain: "online",
    region: "online",
    onlineSpec: {
      platform: "Inquiry",
      minBudget: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    },
  });
  const catalog = [offline, calculable, inquiry];

  // Trigger: resolveHandoffMix (?addMedia= / ?mediaIds=)
  const deeplink = resolveHandoffMix({
    catalog,
    mediaIds: ["calc-1", "inq-1", "ooh-a"],
    units: null,
  });
  assert.deepEqual(
    deeplink.lines.map((l) => l.mediaId).sort(),
    ["calc-1", "ooh-a"],
  );
  assert.deepEqual(deeplink.blockedOnline, ["inq-1"]);

  // Trigger: planCartToBriefHandoff
  const cart = planCartToBriefHandoff(
    {
      items: [
        { mediaId: "calc-1", quantity: 2 },
        { mediaId: "inq-1", quantity: 1 },
        { mediaId: "ooh-a", quantity: 1 },
      ],
    },
    catalog,
  );
  assert.deepEqual(
    cart.mix.lines.map((l) => l.mediaId).sort(),
    ["calc-1", "ooh-a"],
  );
  assert.deepEqual(cart.mix.blockedOnline, ["inq-1"]);

  // Trigger: savedPlannerPlanToBriefHandoff
  const saved = savedPlannerPlanToBriefHandoff(
    {
      campaignMediaIds: ["calc-1", "inq-1"],
      campaignMediaQuantities: { "calc-1": 3 },
    },
    catalog,
  );
  assert.deepEqual(saved.mix.lines, [{ mediaId: "calc-1", units: 3 }]);
  assert.deepEqual(saved.mix.blockedOnline, ["inq-1"]);

  assert.match(quoteWizardSelectBlockedMessage(inquiry, true), /가격 문의/);
  console.log("[PASS] unit — 3 handoff triggers: calculable pass, inquiry blocked");
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

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function waitForPlannerReady(page) {
  await page.goto(`${LOCALE}/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 60_000 });
}

async function fillBudget(page) {
  await page.locator('[data-entry-mode="quick"]').click();
  const budget = page.locator('input[inputmode="numeric"]').first();
  await budget.click();
  await budget.fill("5000");
  await budget.press("Tab");
  await page.waitForTimeout(800);
}

async function openStep2(page) {
  const nextBtn = page.getByRole("button", {
    name: "다음 · 믹스 편집",
    exact: true,
  });
  await nextBtn.click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', {
    timeout: 60_000,
  });
}

async function previewStep1Step2Selection(page, onlineRows) {
  const calculable = onlineRows.find((r) => isPublicQuoteWizardSelectableMedia(r));
  const inquiry = onlineRows.find(
    (r) => r.slug && INQUIRY_SLUGS.includes(r.slug),
  );
  assert.ok(calculable, "no calculable online in catalog API");
  assert.ok(inquiry, "no inquiry slug in catalog API");

  await waitForPlannerReady(page);
  await fillBudget(page);

  const step1Text = await page.locator("body").innerText();
  assert.ok(
    !step1Text.includes(inquiry.name),
    `Step 1 must not list inquiry: ${inquiry.name}`,
  );
  console.log(
    `[PASS] Step 1 — inquiry "${inquiry.name}" absent from quick-rank cards`,
  );

  // Step 2 recommended cards — calculable online should be addable when visible
  await openStep2(page);

  const mixCard = page
    .locator('[data-testid="brief-mix-card-row"]')
    .filter({ hasText: calculable.name })
    .first();
  const cardVisible = (await mixCard.count()) > 0;

  if (cardVisible) {
    await mixCard.getByRole("button", { name: /믹스에 추가|Add to mix/i }).click();
    await page.waitForTimeout(500);
    console.log(
      `[PASS] Step 2 card — calculable "${calculable.name}" addable from recommended list`,
    );
  } else {
    // Top-30 ranking may omit online (scoring known limitation); handoff still must work
    await page.goto(
      `${LOCALE}/planner?addMedia=${encodeURIComponent(calculable.id)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await page.waitForSelector('[data-testid="brief-mix-list"]', {
      timeout: 60_000,
    });
    console.log(
      `[PASS] Step 2 — calculable "${calculable.name}" via handoff (not in top-30 cards; scoring limitation)`,
    );
  }

  const step2Text = await page.locator("body").innerText();
  assert.ok(
    !step2Text.includes(inquiry.name),
    "Step 2 must not list inquiry online in cards",
  );

  const mixRow = page.locator('[data-testid="brief-mix-catalog-row"]').filter({
    hasText: calculable.name,
  });
  assert.ok((await mixRow.count()) > 0, "calculable online not in Step 2 mix list");

  const next = page.locator('[data-testid="brief-step-two-next"]');
  assert.ok(await next.isEnabled(), "Step 2 next should be enabled with online in mix");

  console.log(
    `[PASS] Step 2 render — online in mix, no crash; inquiry "${inquiry.name}" absent from cards`,
  );

  return { calculable, inquiry };
}

async function expectToastText(page, pattern) {
  try {
    await page.getByText(pattern).waitFor({ state: "visible", timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

async function previewHandoffDeeplink(page, calculable, inquiry) {
  await page.evaluate(() => localStorage.removeItem("tkad-planner-brief-v1"));
  await page.goto(
    `${LOCALE}/planner?mediaIds=${encodeURIComponent(calculable.id)},${encodeURIComponent(inquiry.id)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForSelector('[data-testid="brief-mix-list"]', {
    timeout: 60_000,
  });

  const sawToast = await expectToastText(
    page,
    /온라인 매체 1개는 아직 플래너에 담을 수 없습니다|1 online media cannot be added/i,
  );
  assert.ok(sawToast, "inquiry handoff deeplink should show warning toast");

  const mixRows = page.locator('[data-testid="brief-mix-catalog-row"]');
  const names = await mixRows.allInnerTexts();
  assert.ok(
    names.some((t) => t.includes(calculable.name)),
    "calculable should land in mix via deeplink",
  );
  assert.ok(
    !names.some((t) => t.includes(inquiry.name)),
    "inquiry must not land in mix via deeplink",
  );
  console.log("[PASS] preview deeplink handoff — calculable in mix, inquiry toast");
}

async function previewPlanCartHandoff(page, calculable, inquiry) {
  await page.goto(`${LOCALE}/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.evaluate(
    ({ calcId, inqId }) => {
      localStorage.setItem(
        "tkad_plan_cart",
        JSON.stringify({
          items: [
            {
              mediaId: calcId,
              mediaName: "Calc",
              mediaType: "online",
              region: "online",
              price: 0,
              quantity: 2,
              catalogChannel: "online",
            },
            {
              mediaId: inqId,
              mediaName: "Inq",
              mediaType: "online",
              region: "online",
              price: 0,
              quantity: 1,
              catalogChannel: "online",
            },
          ],
          totalBudget: 30_000_000,
          duration: 1,
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    { calcId: calculable.id, inqId: inquiry.id },
  );

  await page.goto(`${LOCALE}/planner?from=plan`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="brief-mix-list"]', {
    timeout: 60_000,
  });

  const sawToast = await expectToastText(
    page,
    /온라인 매체 1개는 플래너에서 제외|1 online media were excluded/i,
  );
  assert.ok(sawToast, "plan cart handoff should toast for inquiry");

  const mixRows = page.locator('[data-testid="brief-mix-catalog-row"]');
  const names = await mixRows.allInnerTexts();
  assert.ok(names.some((t) => t.includes(calculable.name)));
  assert.ok(!names.some((t) => t.includes(inquiry.name)));
  console.log("[PASS] preview plan cart handoff — calculable in mix, inquiry blocked");
}

async function main() {
  unitHandoffGates();

  const health = await fetch(`${BASE}/ko/planner`, { cache: "no-store" }).catch(
    () => null,
  );
  if (!health?.ok) {
    console.error(
      `[FAIL] dev server not reachable at ${BASE} — run npm run dev first`,
    );
    process.exit(1);
  }

  const onlineRows = await fetchOnlineRows();
  const calculableCount = onlineRows.filter((r) =>
    hasOnlinePricingSpec(r),
  ).length;
  const inquiryCount = onlineRows.filter(
    (r) => r.slug && INQUIRY_SLUGS.includes(r.slug),
  ).length;
  console.log(
    `[info] catalog API — calculable=${calculableCount}, inquiry slugs=${inquiryCount}`,
  );

  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.setDefaultTimeout(90_000);
  try {
    const { calculable, inquiry } = await previewStep1Step2Selection(
      page,
      onlineRows,
    );
    await previewHandoffDeeplink(page, calculable, inquiry);
    await previewPlanCartHandoff(page, calculable, inquiry);
  } finally {
    await browser.close();
  }

  console.log(
    JSON.stringify(
      {
        pass: true,
        base: BASE,
        bPlan: "manual select + handoff open for calculable; scoring/metrics unchanged",
        knownLimitation: "online region/footfall display in Step 2 cards not fixed this PR",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
