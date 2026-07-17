#!/usr/bin/env node
/**
 * Local verify: hero-only beta, no violet content-card ramps, smaller icons.
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const ROOT = path.resolve("scripts/.verify-design-report-cases-cleanup");
fs.mkdirSync(ROOT, { recursive: true });

async function scan(page, name) {
  await page.goto(`${BASE}/ko/${name}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ROOT, `${name}-390.png`) });

  return page.evaluate(() => {
    const betas = [...document.querySelectorAll("span, small, div")]
      .filter((el) => {
        const t = (el.textContent || "").trim();
        return (
          (t === "Beta" || t === "BETA" || t === "베타") &&
          el.children.length === 0
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          t: (el.textContent || "").trim(),
          y: Math.round(r.top + scrollY),
          cls: (el.className || "").toString().slice(0, 100),
        };
      });

    const violet = [...document.querySelectorAll("[class*='violet'],[class*='cyan-']")]
      .filter((el) => !el.closest(".tkad-media-page"))
      .map((el) => (el.className || "").toString().slice(0, 120))
      .filter((c) => /violet|cyan-/.test(c));

    const thumbs = [...document.querySelectorAll("[class*='from-zinc'],[class*='from-stone'],[class*='from-violet'],[class*='from-cyan']")]
      .slice(0, 8)
      .map((el) => (el.className || "").toString().slice(0, 100));

    const heroBeta = betas.filter((b) => b.y < 280);
    const bodyBeta = betas.filter((b) => b.y >= 280);

    return {
      path: location.pathname,
      betaTotal: betas.length,
      heroBeta: heroBeta.length,
      bodyBeta: bodyBeta.length,
      betas,
      violetCount: violet.length,
      violetSample: violet.slice(0, 5),
      thumbs,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ko-KR",
  colorScheme: "dark",
});
const page = await ctx.newPage();
const report = await scan(page, "report");
const cases = await scan(page, "cases");
await browser.close();

const out = { report, cases };
fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(out, null, 2));

const pass =
  report.heroBeta >= 1 &&
  report.bodyBeta === 0 &&
  cases.heroBeta >= 1 &&
  cases.bodyBeta === 0 &&
  report.violetCount === 0 &&
  cases.violetCount === 0 &&
  !JSON.stringify(report.thumbs).includes("violet") &&
  !JSON.stringify(cases.thumbs).includes("cyan-600");

console.log(JSON.stringify(out, null, 2));
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
