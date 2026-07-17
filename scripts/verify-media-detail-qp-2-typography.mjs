/**
 * Media detail typography hierarchy verification.
 * Usage: node scripts/verify-media-detail-qp-2-typography.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3021";
const SLUG = "gwanghwamun-rumi-midieo-jeongwangpan-gwanggo";
const OUT = join(process.cwd(), "tmp/media-detail-qp-2-typography");
mkdirSync(OUT, { recursive: true });

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

  // Ensure execution tab for specs h2
  const execTab = page.locator(".tkad-media-page button, .tkad-media-page a").filter({ hasText: /집행/ }).first();
  if (await execTab.count()) {
    await execTab.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  const measured = await page.evaluate(() => {
    const root = document.querySelector(".tkad-media-page");
    if (!root) return { error: "no root" };
    const styleOf = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        color: s.color,
        text: (el.textContent || "").trim().slice(0, 48),
      };
    };

    const h1 = root.querySelector("h1");
    // hero price: accent color large tabular near price card
    const priceCandidates = [...root.querySelectorAll("span, p")].filter((el) =>
      /₩|만|from/.test(el.textContent || ""),
    );
    const priceEl =
      priceCandidates.find((el) => {
        const s = getComputedStyle(el);
        return parseFloat(s.fontSize) >= 24 && parseFloat(s.fontSize) <= 32;
      }) || null;

    const specsH2 = [...root.querySelectorAll("h2")].find((el) =>
      /상세 스펙|Specs|spec/i.test(el.textContent || ""),
    );
    const similarH2 = root.querySelector("#media-similar-heading");
    const reviewsH2 = [...root.querySelectorAll("h2")].find((el) =>
      /리뷰|Review/i.test(el.textContent || ""),
    );

    // KPI labels — first small label in kpi grid
    const kpiLabel = [...root.querySelectorAll("p")].find((el) =>
      /월간 노출|노출|Exposure|CPM|시인성|Visibility/i.test(el.textContent || "") &&
      (el.textContent || "").length < 20,
    );

    // Spec dt
    const specDt = root.querySelector("dl dt");

    const stickyPrice = [...root.querySelectorAll("aside p, aside span")].find((el) => {
      const s = getComputedStyle(el);
      return parseFloat(s.fontSize) >= 20 && /₩|만/.test(el.textContent || "");
    });

    const px = (v) => (v ? Math.round(parseFloat(v.fontSize)) : null);

    return {
      h1: styleOf(h1),
      price: styleOf(priceEl),
      specsH2: styleOf(specsH2),
      similarH2: styleOf(similarH2),
      reviewsH2: styleOf(reviewsH2),
      kpiLabel: styleOf(kpiLabel),
      specDt: styleOf(specDt),
      stickyPrice: styleOf(stickyPrice),
      sizes: {
        h1: px(styleOf(h1)),
        price: px(styleOf(priceEl)),
        specsH2: px(styleOf(specsH2)),
        similarH2: px(styleOf(similarH2)),
        reviewsH2: px(styleOf(reviewsH2)),
        kpiLabel: px(styleOf(kpiLabel)),
        specDt: px(styleOf(specDt)),
        stickyPrice: px(styleOf(stickyPrice)),
      },
    };
  });

  await page.screenshot({ path: join(OUT, "desktop-fold.png"), fullPage: false });
  await page.screenshot({
    path: join(OUT, "desktop-mid.png"),
    fullPage: false,
    // scroll to specs area
  });
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll(".tkad-media-page h2")].find((el) =>
      /상세 스펙|Specs/i.test(el.textContent || ""),
    );
    h2?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "desktop-specs.png"), fullPage: false });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await mpage.waitForSelector(".tkad-media-page h1");
  await mpage.screenshot({ path: join(OUT, "mobile-fold.png"), fullPage: false });
  await mobile.close();

  const s = measured.sizes || {};
  const checks = {
    h1About30: s.h1 != null && s.h1 >= 28 && s.h1 <= 32,
    priceAbout28: s.price != null && s.price >= 26 && s.price <= 30,
    priceNotSameAsH1: s.h1 != null && s.price != null && s.price < s.h1,
    priceIsAccent: measured.price?.color?.includes("255, 98, 0") || measured.price?.color?.includes("255,98,0"),
    specsH2About20: s.specsH2 != null && s.specsH2 >= 18 && s.specsH2 <= 22,
    sectionH2Aligned:
      s.specsH2 != null &&
      s.similarH2 != null &&
      Math.abs(s.specsH2 - s.similarH2) <= 2,
    kpiLabelReadable: s.kpiLabel != null && s.kpiLabel >= 13,
    specDtReadable: s.specDt != null && s.specDt >= 13,
    stickyPrice24: s.stickyPrice != null && s.stickyPrice >= 22 && s.stickyPrice <= 26,
  };
  const pass = Object.values(checks).every(Boolean);

  const summary = { url, pass, checks, measured };
  writeFileSync(join(OUT, "verify.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
