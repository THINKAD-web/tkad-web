/**
 * Media detail layout / density verification.
 * Usage: node scripts/verify-media-detail-qp-3-layout.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3021";
const SLUG = "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";
const OUT = join(process.cwd(), "tmp/media-detail-qp-3-layout");
mkdirSync(OUT, { recursive: true });

const before = join(
  process.cwd(),
  "tmp/media-detail-design-audit/desktop-fold.png",
);
if (existsSync(before)) {
  copyFileSync(before, join(OUT, "before-desktop-fold.png"));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const url = `${BASE}/ko/media/${SLUG}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector(".tkad-media-page h1", { timeout: 30000 });

  const hero = await page.evaluate(() => {
    const root = document.querySelector(".tkad-media-page");
    const h1 = root?.querySelector("h1");
    const headings = [...(root?.querySelectorAll("h1, h2, h3") || [])].map(
      (el) => ({
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 40),
      }),
    );
    const firstH1Index = headings.findIndex((h) => h.tag === "H1");
    const pills = [...(h1?.parentElement?.querySelectorAll("span.rounded-full") || [])]
      .map((el) => (el.textContent || "").trim())
      .filter(Boolean);
    // hero tag pills near title (not trust badges)
    const titleGroup = h1?.closest("div.min-w-0") || h1?.parentElement;
    const tagPills = [
      ...(titleGroup?.querySelectorAll(":scope > div:first-of-type + div span, :scope > div > div.flex.flex-wrap span") ||
        []),
    ];
    // simpler: count rounded-full in first section after h1
    const heroCol = h1?.closest(".min-w-0.flex.flex-col, .min-w-0");
    const allPills = [...(heroCol?.querySelectorAll("span.rounded-full.border") || [])]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t && !/신규|검증|핫|예약/.test(t));

    const sticky = root?.querySelector("aside");
    const stickyQuote = sticky?.querySelector('a[href*="/quote"]');
    const stickyDetails = sticky?.querySelector("details");
    const stickyOpenSecondary =
      stickyDetails != null && stickyDetails.open === false;

    return {
      h1Text: (h1?.textContent || "").trim(),
      firstHeadingIsH1: firstH1Index === 0 || (firstH1Index >= 0 && headings.slice(0, firstH1Index).every((h) => h.tag !== "H2")),
      headings: headings.slice(0, 8),
      heroPills: allPills.slice(0, 6),
      heroPillCount: allPills.length,
      quoteHref: stickyQuote?.getAttribute("href") || null,
      secondaryCollapsed: stickyOpenSecondary,
      hasMoreSpecsDetails: Boolean(
        [...(root?.querySelectorAll("details summary") || [])].some((el) =>
          /추가 스펙|More specs/i.test(el.textContent || ""),
        ),
      ),
    };
  });

  // Open more specs and confirm content
  const moreSpecs = page.locator("summary", { hasText: /추가 스펙|More specs/i });
  let specsAccessible = false;
  if (await moreSpecs.count()) {
    await moreSpecs.first().click();
    await page.waitForTimeout(200);
    specsAccessible = await page.evaluate(() => {
      const details = [...document.querySelectorAll("details")].find((d) =>
        /추가 스펙|More specs/i.test(d.querySelector("summary")?.textContent || ""),
      );
      if (!details?.open) return false;
      const text = details.textContent || "";
      return /운영|타깃|타겟|Target|휘도|Bright|설치/i.test(text);
    });
  }

  await page.screenshot({ path: join(OUT, "after-desktop-fold.png") });
  await page.evaluate(() => {
    document
      .querySelector(".tkad-media-page [role='tablist']")
      ?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, "after-desktop-tabs.png") });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await mpage.waitForSelector(".tkad-media-page h1");
  const mobileH1 = await mpage.locator(".tkad-media-page h1").count();
  await mpage.screenshot({ path: join(OUT, "after-mobile-fold.png") });
  await mobile.close();

  const quoteOk =
    typeof hero.quoteHref === "string" &&
    hero.quoteHref.includes("/quote") &&
    hero.quoteHref.includes("media=") &&
    hero.quoteHref.includes("period=");

  const checks = {
    h1Present: Boolean(hero.h1Text),
    heroPillsMax3: hero.heroPillCount <= 3,
    secondaryCollapsed: hero.secondaryCollapsed,
    quoteOk,
    moreSpecsPresent: hero.hasMoreSpecsDetails,
    specsAccessible: specsAccessible || !hero.hasMoreSpecsDetails,
    mobileH1: mobileH1 === 1,
  };
  const pass = Object.values(checks).every(Boolean);

  const summary = { url, pass, checks, hero, specsAccessible };
  writeFileSync(join(OUT, "verify.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
