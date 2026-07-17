#!/usr/bin/env node
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const ROOT = path.resolve("scripts/.verify-design-final-neon-sweep");
fs.mkdirSync(ROOT, { recursive: true });

const PAGES = [
  ["home", "/ko"],
  ["faq", "/ko/faq"],
  ["compare", "/ko/compare"],
  ["quote", "/ko/quote"],
  ["academy", "/ko/academy"],
  ["map", "/ko/media/map"],
  ["my", "/ko/my"],
  ["login", "/ko/login"],
  ["signup", "/ko/signup"],
];

function scan() {
  const bad = [];
  const NEON_CLASS =
    /(?:^|[\s:])(?:text|bg|border|from|to|via|ring|shadow|accent|fill|stroke)-(?:violet|cyan|fuchsia|purple)-/;
  const NEON_TOKEN = /tkad-neon-grid|from-violet-|to-cyan-|#8[Bb]5[Cc][Ff]6|#7[Cc]3[Aa][Ee][Dd]|#22[Dd]3[Ee][Ee]/i;
  const walk = (el, inMediaPage) => {
    if (!el || el.nodeType !== 1) return;
    const cls = el.className?.toString?.() || "";
    const next = inMediaPage || cls.includes("tkad-media-page");
    // For map page we still flag neon-grid outside intentional media-detail-only CSS
    if (!next || location.pathname.includes("/media/map")) {
      const scopeMediaDetail =
        next &&
        location.pathname.includes("/media/") &&
        !location.pathname.includes("/media/map");
      if (!scopeMediaDetail) {
        if (NEON_CLASS.test(cls) || /tkad-neon-grid/.test(cls)) {
          bad.push({ tag: el.tagName, cls: cls.slice(0, 140), why: "class" });
        }
        const style = el.getAttribute?.("style") || "";
        if (/violet|cyan|#8[Bb]5|#7[Cc]3|#22[Dd]3|168,\s*85,\s*247|34,\s*211,\s*238/i.test(style)) {
          bad.push({ tag: el.tagName, cls: style.slice(0, 120), why: "style" });
        }
      }
    }
    for (const c of el.children) walk(c, next);
  };
  walk(document.body, false);
  // gradient thumbs should not be violet
  const thumbs = [...document.querySelectorAll("[class*='from-']")].filter((el) =>
    /from-violet|from-cyan|to-purple|to-teal-800/.test(el.className?.toString?.() || ""),
  );
  return {
    path: location.pathname,
    badCount: bad.length,
    badSample: bad.slice(0, 8),
    violetThumbCount: thumbs.length,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const [name, url] of PAGES) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
    colorScheme: "dark",
    extraHTTPHeaders: { "Cache-Control": "no-cache" },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ROOT, `${name}-dark.png`) });
    const data = await page.evaluate(scan);
    results.push({ name, url, ...data, error: null });
  } catch (e) {
    results.push({ name, url, badCount: -1, error: String(e.message || e) });
  }
  await ctx.close();
}
await browser.close();

const out = { at: new Date().toISOString(), base: BASE, results };
fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(out, null, 2));
const fail = results.filter(
  (r) => r.error || r.badCount > 0 || (r.violetThumbCount || 0) > 0,
);
console.log(JSON.stringify(out, null, 2));
console.log(fail.length ? `FAIL (${fail.length})` : "PASS");
process.exit(fail.length ? 1 : 0);
