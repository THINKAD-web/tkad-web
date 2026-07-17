/**
 * Sweep-2 verify: blog/community/studio/offline/cart/dashboard/insights/media-list
 * + confirm media DETAIL (.tkad-media-page) may still contain neon.
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3022";
const ROOT = path.resolve("scripts/.verify-design-neon-sweep-2");
fs.mkdirSync(ROOT, { recursive: true });

const CLEAN_PAGES = [
  ["blog", "/ko/blog"],
  ["community", "/ko/community"],
  ["studio-rfp", "/ko/studio/rfp"],
  ["studio-proposal", "/ko/studio/proposal"],
  ["offline", "/offline"],
  ["cart", "/ko/cart"],
  ["dashboard", "/ko/dashboard"],
  ["insights", "/ko/insights"],
  ["media-list", "/ko/media"],
  ["packages", "/ko/packages"],
];

function scanClean() {
  const NEON_CLASS =
    /(?:^|[\s:])(?:text|bg|border|from|to|via|ring|shadow|accent)-(?:violet|cyan|fuchsia|purple)-/;
  const NEON_TOKEN =
    /tkad-neon-grid|tkad-neon-depth|tkad-neon-glow|from-violet-|to-cyan-|#(?:a855f7|7c3aed|8[Bb]5[Cc][Ff]6|22[Dd]3[Ee][Ee])/i;
  const VIOLET = /rgb\(\s*(124|139|168)\s*,\s*(58|92|85)\s*,\s*(237|246|247)\s*\)/i;
  const CYAN = /rgb\(\s*(34|6)\s*,\s*(211|182)\s*,\s*(238|212)\s*\)/i;
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    // media DETAIL scope is intentionally deferred — skip inside it
    if (el.closest(".tkad-media-page")) continue;
    const cls = el.className?.toString?.() || "";
    const style = el.getAttribute?.("style") || "";
    const cs = getComputedStyle(el);
    if (NEON_CLASS.test(cls) || NEON_TOKEN.test(cls) || NEON_TOKEN.test(style)) {
      bad.push({ why: "class/style", cls: (cls || style).slice(0, 120) });
    } else if (
      VIOLET.test(cs.color) ||
      CYAN.test(cs.color) ||
      VIOLET.test(cs.backgroundColor) ||
      CYAN.test(cs.backgroundColor) ||
      /#(?:a855f7|7c3aed|22d3ee)/i.test(cs.backgroundImage)
    ) {
      bad.push({
        why: "computed",
        cls: cls.slice(0, 80),
        color: cs.color,
        bg: cs.backgroundColor,
      });
    }
    if (bad.length >= 10) break;
  }
  return { path: location.pathname, badCount: bad.length, badSample: bad };
}

function scanDetailKeepNeon() {
  const root = document.querySelector(".tkad-media-page");
  if (!root) return { path: location.pathname, hasMediaPage: false, neonHits: 0 };
  const NEON =
    /(?:text|bg|border|from|to)-(?:violet|cyan)-|tkad-neon|from-violet|to-cyan|#(?:a855f7|7c3aed|22d3ee)/i;
  let neonHits = 0;
  for (const el of root.querySelectorAll("*")) {
    const cls = el.className?.toString?.() || "";
    if (NEON.test(cls)) neonHits += 1;
  }
  return { path: location.pathname, hasMediaPage: true, neonHits };
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const [name, url] of CLEAN_PAGES) {
  const ctx = await browser.newContext({
    ...devices["Desktop Chrome"],
    locale: "ko-KR",
    colorScheme: "dark",
    extraHTTPHeaders: { "Cache-Control": "no-cache" },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ROOT, `${name}.png`) });
    results.push({ name, url, ...(await page.evaluate(scanClean)), error: null });
  } catch (e) {
    results.push({ name, url, badCount: -1, error: String(e.message || e) });
  }
  await ctx.close();
}

// Media detail — neon may remain inside .tkad-media-page
{
  const ctx = await browser.newContext({
    ...devices["Desktop Chrome"],
    locale: "ko-KR",
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/ko/media", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1000);
  const href = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="/media/"]')].find((el) => {
      const h = el.getAttribute("href") || "";
      return /\/media\/(?!packages|map|favorites|targets|area|region|type|category)[^/?#]+/.test(h);
    });
    return a?.getAttribute("href") || null;
  });
  let detail = { path: null, hasMediaPage: false, neonHits: 0, href };
  if (href) {
    const origin = new URL(BASE).origin;
    const full = href.startsWith("http") ? href : origin + (href.startsWith("/") ? href : `/${href}`);
    await page.goto(full, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1500);
    detail = { ...(await page.evaluate(scanDetailKeepNeon)), href: full };
    await page.screenshot({ path: path.join(ROOT, "media-detail.png") });
  }
  results.push({ name: "media-detail-defer", ...detail });
  await ctx.close();
}

await browser.close();

const out = { at: new Date().toISOString(), base: BASE, results };
fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(out, null, 2));

const cleanFails = results.filter(
  (r) => r.name !== "media-detail-defer" && (r.error || (r.badCount ?? 0) > 0),
);
const detail = results.find((r) => r.name === "media-detail-defer");
const detailOk = detail && detail.hasMediaPage; // neonHits can be >0 (deferred)

console.log(JSON.stringify(out, null, 2));
if (cleanFails.length) {
  console.log(`FAIL clean pages: ${cleanFails.length}`);
  process.exit(1);
}
if (!detailOk) {
  console.log("WARN: media detail page/.tkad-media-page not found (scope check skipped)");
}
console.log(
  `PASS clean pages; media-detail hasMediaPage=${detail?.hasMediaPage} neonHits=${detail?.neonHits}`,
);
process.exit(0);
