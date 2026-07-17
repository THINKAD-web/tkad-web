/**
 * Media detail qp color conversion verification.
 * Usage: node scripts/verify-media-detail-qp-1-colors.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3021";
const SLUG = "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";
const OUT = join(process.cwd(), "tmp/media-detail-qp-1-colors");
mkdirSync(OUT, { recursive: true });

const NEON_RE =
  /(?:^|\s)(?:[\w:-]*?(?:violet|cyan)-\d{2,3}(?:\/\d+)?|tkad-neon-(?:cta|grid|depth)(?:-[\w]+)?)(?:\s|$)/;

async function scanPage(page) {
  return page.evaluate((neonReSource) => {
    const neonRe = new RegExp(neonReSource);
    const root = document.querySelector(".tkad-media-page");
    if (!root) return { error: "no .tkad-media-page" };

    const hits = [];
    for (const el of root.querySelectorAll("*")) {
      const cls = el.className?.toString?.() || "";
      if (neonRe.test(cls)) {
        hits.push({
          tag: el.tagName.toLowerCase(),
          cls: cls.slice(0, 180),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }

    const sticky = root.querySelector('a[href*="/quote"]');
    const quoteHref = sticky?.getAttribute("href") || null;

    const chartStrokes = [...root.querySelectorAll("svg path, svg line, svg rect")]
      .map((el) => el.getAttribute("stroke") || el.getAttribute("fill") || "")
      .filter((c) => /#22d3ee|#ff6200|rgb/i.test(c));

    return {
      neonHits: hits.length,
      hits: hits.slice(0, 30),
      quoteHref,
      chartSamples: [...new Set(chartStrokes)].slice(0, 12),
    };
  }, NEON_RE.source);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  // Before reference (from prior audit) if present
  const before = join(
    process.cwd(),
    "tmp/media-detail-design-audit/desktop-fold.png",
  );
  if (existsSync(before)) {
    copyFileSync(before, join(OUT, "before-desktop-fold.png"));
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const url = `${BASE}/ko/media/${SLUG}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector(".tkad-media-page", { timeout: 30000 });

  results.location = await scanPage(page);
  await page.screenshot({
    path: join(OUT, "after-desktop-fold.png"),
    fullPage: false,
  });

  // Traffic tab for charts
  const trafficTab = page.locator("button, a", { hasText: /유동|트래픽|Traffic/i }).first();
  if (await trafficTab.count()) {
    await trafficTab.click().catch(() => {});
    await page.waitForTimeout(800);
    results.traffic = await scanPage(page);
    await page.screenshot({
      path: join(OUT, "after-desktop-traffic.png"),
      fullPage: false,
    });
  }

  // Sticky quote CTA href regression
  const quoteLink = page.locator('.tkad-media-page a[href*="/quote"]').first();
  const href = await quoteLink.getAttribute("href");
  results.quoteHref = href;
  const quoteOk =
    typeof href === "string" &&
    href.includes("/quote") &&
    (href.includes("media=") || href.includes("media%3D")) &&
    href.includes("period=");

  // Chart accent from recharts
  results.chartAccent = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".tkad-media-page svg *")];
    const colors = new Set();
    for (const el of nodes) {
      for (const attr of ["stroke", "fill"]) {
        const v = el.getAttribute(attr);
        if (v && /#(?:22d3ee|ff6200)/i.test(v)) colors.add(v.toLowerCase());
      }
      const s = getComputedStyle(el);
      if (/#(?:22d3ee|ff6200)|rgb\(34,\s*211,\s*238\)|rgb\(255,\s*98,\s*0\)/i.test(s.stroke))
        colors.add(s.stroke);
      if (/#(?:22d3ee|ff6200)|rgb\(34,\s*211,\s*238\)|rgb\(255,\s*98,\s*0\)/i.test(s.fill))
        colors.add(s.fill);
    }
    return [...colors];
  });

  // Probe quote modal if open trigger exists
  results.modals = { neonGrid: 0, neonGrad: 0, opened: false };
  const modalTrigger = page.locator('[data-testid="media-quote-modal"], button:has-text("견적"), a:has-text("견적 요청")').first();
  // Check DOM for residual neon-grid anywhere under body after soft navigation stay
  results.modals.neonGrid = await page.locator(".tkad-neon-grid").count();
  results.modals.neonGrad = await page.locator('[class*="from-violet"], [class*="to-cyan"]').count();
  // Probe sticky planner chip color
  const plannerChip = page.locator('.tkad-media-page a[href*="/planner"]').first();
  if (await plannerChip.count()) {
    results.plannerChipColor = await plannerChip.evaluate((el) =>
      getComputedStyle(el).color,
    );
    results.plannerBorder = await plannerChip.evaluate((el) =>
      getComputedStyle(el).borderColor,
    );
  }

  const stickyCta = page
    .locator('.tkad-media-page a[href*="/quote"]')
    .filter({ hasText: /견적/ })
    .first();
  if (await stickyCta.count()) {
    results.stickyCtaBg = await stickyCta.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, bgImage: s.backgroundImage };
    });
  }

  // Mobile
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await mpage.waitForSelector(".tkad-media-page", { timeout: 30000 });
  results.mobile = await scanPage(mpage);
  await mpage.screenshot({
    path: join(OUT, "after-mobile-fold.png"),
    fullPage: false,
  });
  await mobile.close();

  const pass =
    (results.location?.neonHits ?? 99) === 0 &&
    (results.mobile?.neonHits ?? 99) === 0 &&
    quoteOk &&
    results.stickyCtaBg?.bgImage === "none";

  const summary = {
    base: BASE,
    url,
    pass,
    quoteOk,
    quoteHref: href,
    stickyCtaBg: results.stickyCtaBg,
    neonHits: {
      location: results.location?.neonHits,
      traffic: results.traffic?.neonHits,
      mobile: results.mobile?.neonHits,
    },
    chartSamples: results.traffic?.chartSamples || results.location?.chartSamples,
    hitsSample: results.location?.hits,
  };
  writeFileSync(join(OUT, "verify.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
