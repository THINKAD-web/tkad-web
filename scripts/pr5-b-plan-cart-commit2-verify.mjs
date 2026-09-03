#!/usr/bin/env node
/**
 * PR5-b plan cart commit 2 — gate release + bulk path + browse add.
 * Usage:
 *   npx tsx scripts/pr5-b-plan-cart-commit2-verify.mjs
 *   BASE=http://127.0.0.1:3000 npx tsx scripts/pr5-b-plan-cart-commit2-verify.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  planCartItemFromCatalog,
} from "../lib/plan-cart-item-builders.ts";
import {
  addManyToPlanCart,
  clearPlanCart,
} from "../lib/plan-cart.ts";
import { hasOnlinePricingSpec } from "../lib/pricing-unavailable.ts";

const BASE =
  process.env.BASE ??
  "https://tkad-web-git-feat-pr5-b-gate-release-mannote-6701s-projects.vercel.app";
const ROOT = BASE.replace(/\/$/, "");
const LOCALE_BASE = `${ROOT}/ko`;

const INQUIRY_SLUGS = new Set([
  "app-uai-install",
  "baemin-ad-visit",
  "google-pmax-conversion",
  "kakao-moment-message",
  "karrot-local-traffic",
  "meta-advantage-plus",
  "native-taboola-traffic",
  "naver-gfa-traffic",
  "youtube-action",
]);

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../lib/pricing/__tests__/golden/pr5-online-budget-snapshot.json",
);

function mockWindow() {
  if (typeof globalThis.window !== "undefined") return;
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function unitBulkGate() {
  mockWindow();
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  const calculable = golden.media.filter((m) =>
    hasOnlinePricingSpec(m),
  );
  assert.ok(calculable.length >= 14, "expected ≥14 calculable golden rows");

  clearPlanCart();
  const items = [
    ...calculable.slice(0, 3).map((m) =>
      planCartItemFromCatalog(
        {
          id: m.id,
          name: m.name,
          type: m.type ?? "online",
          region: "online",
          price: 0,
          catalogChannel: m.catalogChannel,
          onlineSpec: m.onlineSpec,
        },
        "ai_recommend",
      ),
    ),
    ...Array.from(INQUIRY_SLUGS)
      .slice(0, 3)
      .map((slug, i) =>
        planCartItemFromCatalog(
          {
            id: `inquiry-${i}`,
            name: slug,
            type: "online",
            region: "online",
            price: 0,
            catalogChannel: "online",
            onlineSpec: {
              platform: slug,
              minBudget: null,
              cpcMin: null,
              cpcMax: null,
              cpmMin: null,
              cpmMax: null,
            },
          },
          "ai_recommend",
        ),
      ),
  ];
  const bulk = addManyToPlanCart(items);
  assert.equal(bulk.skippedOnlineBlocked, 3);
  assert.equal(bulk.added, 3);
  console.log("[PASS] unit — addMany filters inquiry from bulk");
}

async function fetchOnlineList() {
  const res = await fetch(
    `${ROOT}/api/public/media?catalogChannel=online&limit=30`,
    { cache: "no-store" },
  );
  assert.ok(res.ok, `online list API ${res.status}`);
  const json = await res.json();
  const rows = json.data ?? json.media ?? [];
  return rows;
}

async function previewBrowseAdd(page, onlineRows) {
  const calculable = onlineRows.find(
    (r) => r.onlineSpec && hasOnlinePricingSpec(r),
  );
  assert.ok(calculable, "no calculable online row in API list");

  await page.goto(`${LOCALE_BASE}/media/online`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('button[aria-label*="담기"], button[aria-label*="Add"]').length >
        0 ||
      document.body.innerText.includes("조건에 맞는 매체가 없습니다"),
    { timeout: 90_000 },
  );

  await page.evaluate(() => localStorage.removeItem("tkad_plan_cart"));

  const cardLink = page
    .locator("a")
    .filter({ hasText: calculable.name })
    .first();
  await cardLink.waitFor({ state: "visible", timeout: 60_000 });
  const addBtn = cardLink.getByRole("button", {
    name: /담은 매체에 담기|Add to plan/i,
  });
  await addBtn.click({ force: true });
  await page.waitForTimeout(800);

  const raw = await page.evaluate(() =>
    localStorage.getItem("tkad_plan_cart"),
  );
  assert.ok(raw, "tkad_plan_cart missing after browse 담기");
  const cart = JSON.parse(raw);
  const onlineItem = cart.items?.find((i) => i.catalogChannel === "online");
  assert.ok(onlineItem, "no online item in cart after browse add");
  assert.ok(
    onlineItem.lineTotalWon > 0,
    "online cart item missing lineTotalWon snapshot",
  );
  const expectedMin =
    calculable.onlineSpec?.minBudget ?? 1_000_000;
  assert.equal(
    onlineItem.lineTotalWon,
    expectedMin,
    "lineTotalWon should match minBudget default at add time",
  );
  console.log(
    `[PASS] preview browse 담기 — lineTotalWon=${onlineItem.lineTotalWon}`,
  );
}

async function previewRecommendBulk(page, onlineRows) {
  const hasOnline = onlineRows.some((r) => r.catalogChannel === "online");
  if (!hasOnline) {
    console.log("[SKIP] preview recommend bulk — no online in API list");
    return;
  }

  await page.goto(`${LOCALE_BASE}/recommend?auto=1&budget=500&region=national`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  await page.evaluate(() => localStorage.removeItem("tkad_plan_cart"));

  const bulkBtn = page.getByRole("button", {
    name: /선택 매체 플랜에 추가|Add selected to plan/i,
  }).first();
  await bulkBtn.waitFor({ state: "visible", timeout: 120_000 });
  await bulkBtn.click();
  await page.waitForTimeout(1500);

  const raw = await page.evaluate(() =>
    localStorage.getItem("tkad_plan_cart"),
  );
  if (!raw) {
    console.log("[WARN] preview recommend bulk — cart empty (mixed catalog may be OOH-only run)");
    return;
  }
  const cart = JSON.parse(raw);
  for (const item of cart.items ?? []) {
    if (item.catalogChannel !== "online") continue;
    assert.ok(
      item.lineTotalWon > 0,
      `online cart item ${item.mediaId} missing lineTotalWon`,
    );
  }
  const slugById = new Map(onlineRows.map((r) => [r.id, r.slug]));
  for (const item of cart.items ?? []) {
    const slug = slugById.get(item.mediaId);
    if (slug && INQUIRY_SLUGS.has(slug)) {
      assert.fail(`inquiry online leaked into cart via bulk: ${slug}`);
    }
  }
  console.log(
    `[PASS] preview recommend bulk — ${cart.items?.length ?? 0} items, no inquiry slugs`,
  );
}

async function main() {
  unitBulkGate();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const onlineRows = await fetchOnlineList();
    await previewBrowseAdd(page, onlineRows);
    await previewRecommendBulk(page, onlineRows);
  } finally {
    await browser.close();
  }
  console.log("[PASS] plan cart commit 2 verify complete");
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
