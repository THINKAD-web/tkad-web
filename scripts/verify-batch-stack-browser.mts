/**
 * Visual smoke for batch-stack render checklist (7 items).
 * Writes screenshots under scripts/.verify-batch-stack-preview/
 *
 *   BASE_URL=http://127.0.0.1:3010 npx tsx scripts/verify-batch-stack-browser.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = "scripts/.verify-batch-stack-preview";
mkdirSync(OUT, { recursive: true });

const SHARED_ID =
  process.env.SHARED_PLAN_ID ?? "cmrwwsdof000104l4hy3be74e";
const MEDIA_SLUG =
  process.env.MEDIA_SLUG ??
  "hongdae-paradaiseutel-bilbodeu-gwanggo";
const PROOF_TOKEN =
  process.env.PROOF_TOKEN ??
  "c3669e57fc81174b51e7d04621d212470c8235f06639ba59";
const CAMPAIGN_ID =
  process.env.CAMPAIGN_ID ?? "cmo3j20jp000004jw8nzuwb75";

type Result = {
  id: string;
  url: string;
  http?: number | null;
  pass: boolean;
  matched: string[];
  missing: string[];
  extra?: Record<string, unknown>;
  shot?: string;
  error?: string;
};

async function checkPage(
  page: import("playwright").Page,
  id: string,
  path: string,
  expectAny: string[],
  expectAll: string[] = [],
): Promise<Result> {
  const url = `${BASE}${path}`;
  try {
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(1800);
    const text = await page.locator("body").innerText().catch(() => "");
    const matched = [...expectAny, ...expectAll].filter((e) =>
      text.includes(e),
    );
    const missingAll = expectAll.filter((e) => !text.includes(e));
    const anyOk =
      expectAny.length === 0 || expectAny.some((e) => text.includes(e));
    const pass = anyOk && missingAll.length === 0;
    const shot = `${OUT}/${id}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    return {
      id,
      url,
      http: res?.status() ?? null,
      pass,
      matched,
      missing: [
        ...missingAll,
        ...(anyOk ? [] : expectAny.map((e) => `(any)${e}`)),
      ],
      shot,
    };
  } catch (e) {
    return {
      id,
      url,
      pass: false,
      matched: [],
      missing: expectAll,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const results: Result[] = [];

  // 1) pricing 5 tiers
  results.push(
    await checkPage(page, "01-pricing-5tiers", "/ko/pricing", [], [
      "FREE",
      "LITE",
      "PRO",
      "AGENCY",
      "ENTERPRISE",
    ]),
  );

  // 2) instant booking badge (안내)
  results.push(
    await checkPage(
      page,
      "02-instant-badge",
      `/ko/media/${MEDIA_SLUG}`,
      ["즉시 예약(안내)", "즉시예약(안내)", "Instant book (info)", "즉시 예약"],
      [],
    ),
  );

  // 3) GPS recommended proof upload UI
  results.push(
    await checkPage(
      page,
      "03-proof-gps",
      `/ko/proof-upload/${PROOF_TOKEN}`,
      ["GPS", "위치"],
      [],
    ),
  );

  // 4) completion report wording (guarantee public page — PDF uses same copy)
  results.push(
    await checkPage(page, "04-completion-estimate-copy", "/ko/guarantee", [], [
      "검증된 추정치",
    ]),
  );

  // 5) campaign detail — may redirect to login; still capture
  results.push(
    await checkPage(
      page,
      "05-campaign-detail",
      `/ko/dashboard/campaigns/${CAMPAIGN_ID}`,
      ["예약", "리포트", "로그인", "매체 예약", "캠페인"],
      [],
    ),
  );

  // 6) My hub
  results.push(
    await checkPage(page, "06-my-hub", "/ko/my", ["마이", "로그인", "캠페인", "플랜"], []),
  );

  // 7) planner shared noindex
  {
    const url = `${BASE}/ko/planner/shared/${SHARED_ID}`;
    try {
      const res = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(1200);
      const robots = await page
        .locator('meta[name="robots"]')
        .getAttribute("content");
      const shot = `${OUT}/07-planner-shared-noindex.png`;
      await page.screenshot({ path: shot, fullPage: true });
      const noindex = Boolean(robots && /noindex/i.test(robots));
      results.push({
        id: "07-planner-shared-noindex",
        url,
        http: res?.status() ?? null,
        pass: noindex,
        matched: robots ? [robots] : [],
        missing: noindex ? [] : ["noindex"],
        extra: { robots },
        shot,
      });
    } catch (e) {
      results.push({
        id: "07-planner-shared-noindex",
        url,
        pass: false,
        matched: [],
        missing: ["noindex"],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass);
  console.log(
    `PASS ${results.length - failed.length}/${results.length}`,
  );
  await browser.close();
  if (failed.length) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
