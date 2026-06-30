#!/usr/bin/env node
/**
 * Capture hub / chips / theme screenshots (requires dev server on :3000).
 * Usage: node scripts/capture-hub-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "screenshots", "hub-nav");

const PAGES = [
  { name: "home-light", url: "/ko", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "home-dark", url: "/ko", theme: "dark", viewport: { width: 390, height: 844 } },
  { name: "media-chips", url: "/ko/media", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "planner-chips", url: "/ko/planner", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "cases-chips", url: "/ko/cases", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "report-chips", url: "/ko/report", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "academy-chips", url: "/ko/academy", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "creatives-chips", url: "/ko/creatives", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "my-chips", url: "/ko/my", theme: "light", viewport: { width: 390, height: 844 } },
  { name: "theme-auto-1759", url: "/ko", theme: "auto-1759", viewport: { width: 390, height: 844 } },
  { name: "theme-auto-1800", url: "/ko", theme: "auto-1800", viewport: { width: 390, height: 844 } },
];

async function applyTheme(page, theme) {
  if (theme === "auto-1759" || theme === "auto-1800") {
    const hour = theme === "auto-1759" ? 17 : 18;
    const minute = theme === "auto-1759" ? 59 : 0;
    await page.addInitScript(({ h, m }) => {
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(2026, 4, 24, h, m, 0);
          } else {
            super(...args);
          }
        }
        static now() {
          return new RealDate(2026, 4, 24, h, m, 0).getTime();
        }
      };
      localStorage.removeItem("tkad-theme-manual-until");
      localStorage.removeItem("tkad-theme");
    }, { h: hour, m: minute });
    return;
  }
  await page.evaluate((t) => {
    localStorage.removeItem("tkad-theme-manual-until");
    localStorage.setItem("tkad-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ko-KR" });

  for (const shot of PAGES) {
    const page = await context.newPage();
    await page.setViewportSize(shot.viewport);
    if (shot.theme.startsWith("auto-")) {
      await applyTheme(page, shot.theme);
    }
    await page.goto(`${BASE}${shot.url}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    if (!shot.theme.startsWith("auto-")) {
      await applyTheme(page, shot.theme);
    }
    await page.waitForSelector(
      shot.name.startsWith("home") || shot.name.startsWith("theme-auto")
        ? ".grid-cols-5"
        : '[data-screenshot="subpage-chips"]',
      { timeout: 45000 },
    ).catch(() => null);
    if (shot.theme.startsWith("auto-")) {
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      console.log(`${shot.name}: dark=${isDark}`);
    }
    await page.waitForTimeout(1200);
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({
      path: file,
      fullPage:
        shot.name.startsWith("home") || shot.name.startsWith("theme-auto"),
    });
    console.log("saved", file);
    await page.close();
  }

  await browser.close();
  console.log("done", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
