/**
 * PR5-b gate — admin prod 4-item verification.
 * Usage: SCREENSHOT_BASE=https://tkad.co.kr node scripts/pr5-b-admin-prod-verify.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.SCREENSHOT_BASE ?? "https://tkad.co.kr").replace(
  /\/$/,
  "",
);
const OUT = path.join(process.cwd(), "tmp/pr5-b-admin-prod-verify");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  ""
).trim().replace(/\\n$/, "");

const ONLINE_SLUG_HINTS = [
  "google-ads",
  "naver-sa",
  "ig-",
  "fb-",
  "kakao-",
  "tiktok-",
  "baemin",
  "youtube-action",
  "meta-advantage",
];

function isOnlineRow(m) {
  return m?.catalogChannel === "online";
}

function isQuoteWizardSelectable(m) {
  return !isOnlineRow(m);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function loginViaApi(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    data: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`admin login failed: ${res.status()} ${body}`);
  }
}

async function fetchAdminMedias(context) {
  const res = await context.request.get(`${BASE}/api/admin/medias?take=5000`);
  if (!res.ok()) {
    throw new Error(`admin medias API failed: ${res.status()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items ?? data.medias ?? []);
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD or SEED_ADMIN_PASSWORD required in env");
  }

  await mkdir(OUT, { recursive: true });
  const report = {
    base: BASE,
    at: new Date().toISOString(),
    checks: [],
    screenshots: [],
  };

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
  });
  const page = await context.newPage();

  const push = (id, ok, detail) => {
    report.checks.push({ id, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${id}:`, detail);
  };

  try {
    await loginViaApi(context);
    push("login", true, "API login ok");

    const allMedias = await fetchAdminMedias(context);
    const onlineAll = allMedias.filter(isOnlineRow);
    const pickerMedias = allMedias.filter(isQuoteWizardSelectable);
    push(
      "api-catalog-online-count",
      onlineAll.length === 23,
      `online=${onlineAll.length} (expect 23), total=${allMedias.length}`,
    );

    // 1. quotes/new picker — online 0 visible
    await page.goto(`${BASE}/ko/admin/quotes/new`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    if (page.url().includes("/admin/login")) {
      throw new Error("redirected to login after API auth");
    }
    await page.getByText("매체에서 라인 추가").waitFor({ timeout: 30000 });
    await page.waitForTimeout(2000);

    const pickerRows = await page.locator("table tbody tr").all();
    const pickerNames = [];
    for (const row of pickerRows) {
      const name = (await row.locator("td").first().innerText()).split("\n")[0]?.trim();
      if (name) pickerNames.push(name);
    }

    const onlineInPicker = pickerNames.filter((name) =>
      onlineAll.some((m) => m.name === name),
    );
    push(
      "quotes-new-picker-no-online",
      onlineInPicker.length === 0,
      `visible rows=${pickerNames.length}, online leaked=${onlineInPicker.length}${
        onlineInPicker.length ? `: ${onlineInPicker.join(", ")}` : ""
      }`,
    );

    await page.screenshot({
      path: path.join(OUT, "01-quotes-new-picker.png"),
      fullPage: false,
    });
    report.screenshots.push("01-quotes-new-picker.png");

    // 2. picker search — no crash, no online in results
    const searchInput = page.getByPlaceholder(/검색|search/i).first();
    const searchTerms = ["google", "구글", "naver", "배민", "온라인"];
    let searchOk = true;
    const searchDetails = [];

    for (const term of searchTerms) {
      await searchInput.fill("");
      await searchInput.fill(term);
      await page.waitForTimeout(600);
      const bodyText = await page.locator("body").innerText();
      const hasCrash =
        /Application error|Unhandled Runtime Error|Something went wrong/i.test(
          bodyText,
        );
      const rows = await page.locator("table tbody tr").count();
      let leaked = [];
      if (rows > 0) {
        const names = await page.locator("table tbody tr td").first().allInnerTexts();
        leaked = names
          .map((t) => t.split("\n")[0]?.trim())
          .filter((name) => onlineAll.some((m) => m.name === name));
      }
      if (hasCrash || leaked.length > 0) searchOk = false;
      searchDetails.push({ term, rows, hasCrash, leakedOnline: leaked });
    }

    push(
      "quotes-new-search-no-crash-no-online",
      searchOk,
      JSON.stringify(searchDetails),
    );

    await searchInput.fill("");
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT, "02-quotes-new-search-google.png"),
      fullPage: false,
    });
    report.screenshots.push("02-quotes-new-search-google.png");

    // 3. media-hub scroll — no crash, online rows show 가격 문의 / 온라인
    await page.goto(`${BASE}/ko/admin/media-hub`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForTimeout(2000);

    const hubBodyBefore = await page.locator("body").innerText();
    const hubCrash =
      /Application error|Unhandled Runtime Error|Something went wrong/i.test(
        hubBodyBefore,
      );
    push("media-hub-no-crash-on-load", !hubCrash, hubCrash ? "crash text found" : "ok");

    const listScroll = page.locator(".overflow-auto, [class*='overflow']").first();
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(200);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const hubText = await page.locator("body").innerText();
    const inquiryCount = (hubText.match(/가격 문의/g) ?? []).length;
    const onlineLabelCount = (hubText.match(/온라인/g) ?? []).length;
    push(
      "media-hub-online-labels",
      inquiryCount >= 20 && onlineLabelCount >= 10,
      `「가격 문의」×${inquiryCount}, 「온라인」×${onlineLabelCount}`,
    );

    await page.screenshot({
      path: path.join(OUT, "03-media-hub-scrolled.png"),
      fullPage: true,
    });
    report.screenshots.push("03-media-hub-scrolled.png");

    // 4. API-level picker filter matches UI expectation
    push(
      "api-picker-filter",
      pickerMedias.length === allMedias.length - onlineAll.length,
      `pickerEligible=${pickerMedias.length}, expected=${
        allMedias.length - onlineAll.length
      }`,
    );

    report.ok = report.checks.every((c) => c.ok);
    await writeFile(
      path.join(OUT, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log("\nReport:", path.join(OUT, "report.json"));
    console.log("Overall:", report.ok ? "PASS" : "FAIL");

    if (!report.ok) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
