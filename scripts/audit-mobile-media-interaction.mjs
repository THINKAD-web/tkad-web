#!/usr/bin/env node
/**
 * PART W + PART X — mobile freeze repro + /ko/media interaction timing
 */
import { chromium, devices } from "playwright";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = (process.env.BASE ?? "https://tkad.co.kr").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp", "mobile-media-perf-audit");

async function launchBrowser(deviceName) {
  const device = devices[deviceName];
  try {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const ctx = await browser.newContext({ ...device, locale: "ko-KR" });
    return { browser, ctx, page: await ctx.newPage() };
  } catch {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ ...device, locale: "ko-KR" });
    return { browser, ctx, page: await ctx.newPage() };
  }
}

async function measureClick(page, label, clickFn) {
  const t0 = performance.now();
  await clickFn();
  // wait for visible change heuristic
  await page.waitForTimeout(500);
  const t1 = performance.now();
  return { label, ms: Math.round(t1 - t0) };
}

async function partW(page, deviceName) {
  const results = [];
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/ko/media`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(5000);

  // Scroll then tap menu
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);

  const menuBtn = page.getByRole("button", { name: /메뉴|menu/i }).first();
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    await menuBtn.click({ timeout: 10000 }).catch((e) => {
      results.push({ test: `menu-open-${i}`, ok: false, err: String(e) });
    });
    const openMs = Date.now() - t0;
    const panelVisible = (await page.locator(".tkad-site-header-panel").count()) > 0;
    results.push({ test: `menu-open-${i}`, ok: panelVisible, ms: openMs });

    const closeBtn = page.getByRole("button", { name: /메뉴 닫기|Close menu/i }).first();
    const t1 = Date.now();
    await closeBtn.click({ timeout: 5000 }).catch(() => menuBtn.click());
    results.push({ test: `menu-close-${i}`, ms: Date.now() - t1, panelHidden: (await page.locator(".tkad-site-header-panel").count()) === 0 });
    await page.waitForTimeout(200);
  }

  // Rapid double-tap menu — should stay open (toggle guard)
  await menuBtn.click();
  await page.waitForTimeout(100);
  await menuBtn.click({ delay: 50 }).catch(() => {});
  await page.waitForTimeout(400);
  const doubleTapPanelCount = await page.locator(".tkad-site-header-panel").count();
  results.push({
    test: "menu-double-tap",
    panelCount: doubleTapPanelCount,
    ok: doubleTapPanelCount > 0,
  });
  if (doubleTapPanelCount > 0) {
    const closeBtn = page.getByRole("button", { name: /메뉴 닫기|Close menu/i }).first();
    await closeBtn.click().catch(() => menuBtn.click());
    await page.waitForTimeout(200);
  }

  // Bottom tab contact sheet (mobile)
  const contactTab = page.getByRole("button", { name: /문의|contact/i }).first();
  if (await contactTab.count()) {
    const t0 = Date.now();
    await contactTab.click();
    await page.locator('[data-screenshot="contact-channel-sheet"]').waitFor({ timeout: 8000 }).catch(() => {});
    results.push({ test: "contact-sheet-open", ms: Date.now() - t0, visible: (await page.locator('[data-screenshot="contact-channel-sheet"]').count()) > 0 });

    // Open AI from sheet — measure first visual (loading shell or modal)
    const aiBtn = page.getByRole("button", { name: /AI 챗봇|AI chatbot/i }).first();
    if (await aiBtn.count()) {
      const tAi = Date.now();
      await aiBtn.click();
      await Promise.race([
        page.locator('[data-screenshot="ai-chat-modal-loading"]').waitFor({ timeout: 8000 }),
        page.locator('[role="dialog"]').filter({ hasText: /AI|챗봇|chat/i }).first().waitFor({ timeout: 8000 }),
      ]).catch(() => {});
      results.push({
        test: "ai-first-response",
        ms: Date.now() - tAi,
        loadingShell: (await page.locator('[data-screenshot="ai-chat-modal-loading"]').count()) > 0,
      });
      await page.waitForTimeout(500);
      results.push({ test: "ai-modal-open-complete", ms: Date.now() - tAi });
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Scroll lock state after menu
  const scrollLock = await page.evaluate(() => ({
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    navLock: document.documentElement.classList.contains("tkad-nav-scroll-lock"),
  }));
  results.push({ test: "scroll-lock-state-after", scrollLock });

  return { device: deviceName, partW: results, errors: [...new Set(errors)].slice(0, 10) };
}

async function partX(page, deviceName) {
  const timings = [];
  const longTasks = [];

  await page.goto(`${BASE}/ko/media`, { waitUntil: "networkidle", timeout: 120000 }).catch(() =>
    page.goto(`${BASE}/ko/media`, { waitUntil: "domcontentloaded", timeout: 120000 }),
  );
  await page.waitForTimeout(6000);

  await page.evaluate(() => {
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration > 50) {
          window.__longTasks = window.__longTasks || [];
          window.__longTasks.push({
            name: e.name,
            duration: Math.round(e.duration),
            start: Math.round(e.startTime),
          });
        }
      }
    });
    obs.observe({ entryTypes: ["longtask"] });
    window.__longTasks = [];
  });

  // a) Hotspot chip
  const gangnam = page.getByRole("button", { name: /강남/ }).first();
  if (await gangnam.count()) {
    const t0 = Date.now();
    await gangnam.click();
    const activeMs = Date.now() - t0;
    await page.waitForURL(/regionSub=|regionMain=/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    timings.push({ action: "hotspot-강남", clickToActiveMs: activeMs, clickToSettleMs: Date.now() - t0 });
  }

  // b) Filter sheet
  const filterBtn = page.getByRole("button", { name: /필터 열기|Open filters|^필터$|^Filters$/i }).first();
  if (await filterBtn.count()) {
    const t0 = Date.now();
    await filterBtn.click();
    await page.locator('[role="dialog"], [data-vaul-drawer]').first().waitFor({ timeout: 8000 }).catch(() => {});
    timings.push({ action: "filter-sheet-open", ms: Date.now() - t0 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // c) View modes (desktop toolbar visible on iPhone landscape? use getByRole)
  for (const mode of ["피드", "컴팩트"]) {
    const btn = page.getByRole("button", { name: mode }).first();
    if (await btn.count()) {
      const t0 = Date.now();
      await btn.click();
      await page.waitForTimeout(1200);
      timings.push({ action: `view-${mode}`, ms: Date.now() - t0 });
    }
  }

  // Map — loading overlay then navigate
  const mapBtn = page.getByRole("button", { name: /지도에서 보기|Open map|^지도$|^Map$/i }).first();
  if (await mapBtn.count()) {
    const t0 = Date.now();
    await mapBtn.click();
    await Promise.race([
      page.locator('[data-screenshot="map-navigation-loading"]').waitFor({ timeout: 5000 }),
      page.waitForURL(/\/media\/map/, { timeout: 20000 }),
    ]).catch(() => {});
    timings.push({
      action: "view-지도-navigate",
      ms: Date.now() - t0,
      loadingOverlay: (await page.locator('[data-screenshot="map-navigation-loading"]').count()) > 0,
      url: page.url(),
    });
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  const lt = await page.evaluate(() => window.__longTasks ?? []);

  return { device: deviceName, timings, longTasks: lt };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), base: BASE, devices: [] };

  for (const deviceName of ["iPhone 14", "Pixel 7"]) {
    const { browser, page } = await launchBrowser(deviceName);
    page.setDefaultTimeout(60000);
    const w = await partW(page, deviceName);
    const x = await partX(page, deviceName);
    report.devices.push({ ...w, partX: x });
    await page.screenshot({ path: path.join(OUT, `${deviceName.replace(/\s+/g, "-")}-media.png`) });
    await browser.close();
  }

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
