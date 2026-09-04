#!/usr/bin/env node
/**
 * PR5-d Phase 1 — visual card layout check for long-content online media.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (
  process.env.BASE ?? "https://tkad-80hqerbyf-mannote-6701s-projects.vercel.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "reports/pr5-d/visual-check");
const TARGETS = ["naver-gfa-traffic", "baemin-ad-visit", "kakao-moment-message"];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

function clipIssues(metrics) {
  const issues = [];
  if (metrics.overflowX) issues.push("horizontal-overflow");
  if (metrics.overflowY && metrics.clientHeight > 0 && metrics.scrollHeight > metrics.clientHeight * 1.5) {
    issues.push("vertical-overflow-excessive");
  }
  if (metrics.lineClamp) issues.push("line-clamp-active");
  return issues;
}

async function inspectCard(page, slug) {
  const card = page.locator(`a[href*="/media/${slug}"], [data-slug="${slug}"]`).first();
  const cardCount = await card.count();
  if (cardCount === 0) {
    // fallback: text match on list page
    const byText = page.getByRole("link").filter({ hasText: slug.includes("naver") ? "GFA" : slug.includes("baemin") ? "배민" : "메시지" });
    if ((await byText.count()) === 0) return { found: false, issues: ["card-not-found"] };
  }
  const target = cardCount > 0 ? card : page.getByRole("link").filter({ hasText: /GFA|배민|메시지/ }).first();
  await target.scrollIntoViewIfNeeded();
  const metrics = await target.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowX: el.scrollWidth > el.clientWidth + 2,
      overflowY: el.scrollHeight > el.clientHeight + 2,
      lineClamp:
        style.webkitLineClamp !== "none" && style.webkitLineClamp !== "" ||
        style.display === "-webkit-box",
      textLength: text.length,
    };
  });
  return { found: true, metrics, issues: clipIssues(metrics) };
}

async function inspectDetail(page, slug) {
  const desc = page.locator("main").first();
  await desc.waitFor({ state: "visible", timeout: 30_000 });
  const metrics = await desc.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const rect = el.getBoundingClientRect();
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowX: el.scrollWidth > el.clientWidth + 2,
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      horizontalPageOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      textLength: text.length,
      lineClamp: style.webkitLineClamp !== "none" && style.webkitLineClamp !== "",
    };
  });
  const issues = [];
  if (metrics.horizontalPageOverflow) issues.push("page-horizontal-scroll");
  if (metrics.overflowX) issues.push("main-horizontal-overflow");
  return { metrics, issues };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const results = { base: BASE, viewports: {} };

  // Mobile list
  await page.goto(`${BASE}/ko/media/online`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, "mobile-list-online.png"), fullPage: true });
  const listResults = {};
  for (const slug of TARGETS) {
    listResults[slug] = await inspectCard(page, slug);
  }
  results.viewports.mobile390 = { list: listResults };

  for (const slug of TARGETS) {
    await page.goto(`${BASE}/ko/media/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUT, `mobile-detail-${slug}.png`), fullPage: true });
    results[`mobile_detail_${slug}`] = await inspectDetail(page, slug);
  }

  // Desktop list + details for long ones
  await context.close();
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const dpage = await desktop.newPage();
  await dpage.goto(`${BASE}/ko/media/online`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dpage.waitForTimeout(3000);
  await dpage.screenshot({ path: join(OUT, "desktop-list-online.png"), fullPage: false });
  const desktopList = {};
  for (const slug of ["naver-gfa-traffic", "baemin-ad-visit"]) {
    desktopList[slug] = await inspectCard(dpage, slug);
  }
  results.viewports.desktop1280 = { list: desktopList };

  for (const slug of ["naver-gfa-traffic", "baemin-ad-visit"]) {
    await dpage.goto(`${BASE}/ko/media/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await dpage.waitForTimeout(2000);
    await dpage.screenshot({ path: join(OUT, `desktop-detail-${slug}.png`), fullPage: true });
    results[`desktop_detail_${slug}`] = await inspectDetail(dpage, slug);
  }

  await browser.close();

  const allIssues = Object.entries(results)
    .flatMap(([k, v]) => {
      if (typeof v !== "object" || v === null) return [];
      const issues = v.issues;
      return issues?.length ? [`${k}: ${issues.join(", ")}`] : [];
    })
    .concat(
      ...Object.values(results.viewports).flatMap((v) =>
        Object.entries(v.list ?? {}).flatMap(([slug, r]) =>
          r.issues?.length ? [`list/${slug}: ${r.issues.join(", ")}`] : [],
        ),
      ),
    );

  const report = {
    pass: allIssues.length === 0,
    issueCount: allIssues.length,
    issues: allIssues,
    screenshots: OUT,
    results,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
