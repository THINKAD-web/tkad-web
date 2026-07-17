/**
 * Admin Phase 3 bridges — verify deep links + nav, save screenshots to tmp/.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:3010 node scripts/capture-admin-phase3-bridges.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.join(process.cwd(), "tmp/admin-phase3-bridges");
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  "thinkad2024"
).trim();

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

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const report = { base: BASE, ok: true, checks: [], screenshots: [] };

  try {
    await loginViaApi(context);

    await page.goto(`${BASE}/ko/admin`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    report.checks.push({
      id: "dashboard-ops",
      ok: (await page.getByText("오늘 처리").count()) > 0,
    });
    report.screenshots.push(await shot(page, "01-dashboard-ops"));

    const calLink = page.locator('a[href*="/admin/calendar"]').first();
    report.checks.push({
      id: "nav-calendar-media",
      ok: (await calLink.count()) > 0,
      href: (await calLink.count())
        ? await calLink.getAttribute("href")
        : null,
    });
    const crmDemoExact = page.locator(
      'a[href$="/admin/crm"], a[href$="/ko/admin/crm"]',
    );
    report.checks.push({
      id: "nav-crm-demo-hidden",
      ok: (await crmDemoExact.count()) === 0,
    });
    report.screenshots.push(await shot(page, "02-nav-media-calendar"));

    await page.goto(`${BASE}/ko/admin/quotes?tab=booking`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
    const holdBtn = page.getByRole("link", { name: /캘린더 홀드 보기/ });
    const holdCount = await holdBtn.count();
    report.checks.push({ id: "booking-hold-link", ok: true, holdCount });
    report.screenshots.push(await shot(page, "03-quotes-booking"));

    if (holdCount > 0) {
      const holdHref = await holdBtn.first().getAttribute("href");
      report.checks.push({
        id: "hold-href-shape",
        ok: Boolean(
          holdHref &&
            holdHref.includes("/admin/media-hub") &&
            holdHref.includes("mediaId=") &&
            holdHref.includes("highlightQuoteId="),
        ),
        holdHref,
      });
      await holdBtn.first().click();
      await page.waitForURL(/media-hub/, { timeout: 30000 });
      await page.waitForTimeout(2500);
      report.checks.push({
        id: "media-hub-deeplink",
        ok: (await page.getByText(/견적 딥링크 매체 필터/).count()) > 0,
        url: page.url(),
      });
      report.screenshots.push(await shot(page, "04-media-hub-highlight"));
    } else {
      await page.goto(
        `${BASE}/ko/admin/media-hub?mediaId=demo&highlightQuoteId=demo`,
        { waitUntil: "domcontentloaded", timeout: 60000 },
      );
      await page.waitForTimeout(2000);
      report.checks.push({
        id: "media-hub-deeplink-fallback",
        ok: (await page.getByText(/견적 딥링크 매체 필터/).count()) > 0,
      });
      report.screenshots.push(await shot(page, "04-media-hub-deeplink-ui"));
    }

    await page.goto(`${BASE}/ko/admin/inquiries`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);
    report.screenshots.push(await shot(page, "05-inquiries"));

    await page.goto(`${BASE}/ko/admin/calendar`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    report.checks.push({
      id: "calendar-url",
      ok: page.url().includes("/admin/calendar"),
    });
    report.screenshots.push(await shot(page, "06-campaign-calendar"));
  } catch (e) {
    report.ok = false;
    report.error = e instanceof Error ? e.message : String(e);
    try {
      report.screenshots.push(await shot(page, "99-error"));
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  report.ok = report.ok && report.checks.every((c) => c.ok !== false);
  await writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
