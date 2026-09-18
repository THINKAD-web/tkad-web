import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3459").replace(/\/$/, "");
const OUT = "reports/ds-w0";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const email = `ds-w0-${Date.now()}@tkad-e2e.invalid`;
  const password = `E2e_${Date.now()}_Aa1`;
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: "DS W0",
      locale: "ko",
      startRole: "ADVERTISER",
    }),
  });
  const set = reg.headers.getSetCookie?.() ?? [];
  const cookie = set.find((c) => c.startsWith("tkad_user_session="))?.split(";")[0] ?? "";
  if (!cookie) throw new Error("register failed");

  const cat = await (await fetch(`${BASE}/api/public/media-catalog`)).json();
  const mediaId = (Array.isArray(cat) ? cat : []).find(
    (m: { price?: number; id: string }) => (m.price ?? 0) > 0,
  )?.id;
  if (!mediaId) throw new Error("no media");

  await fetch(`${BASE}/api/campaign-plan`, {
    method: "POST",
    headers: { "content-type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      brief: {
        budgetInputWon: 30_000_000,
        budgetMode: "total",
        regionCodes: ["11"],
        goal: "brand",
        flightStart: "2026-10-01",
        flightEnd: "2026-10-31",
        freeText: "W0 pilot",
      },
      mixUnits: { [mediaId]: 1 },
      mixPriceOptionIndex: {},
      customLines: [],
      reportCopy: { documentTitle: "W0 Pilot Plan" },
    }),
  });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: "tkad_user_session",
      value: cookie.split("=")[1]!,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`${BASE}/ko/my/plan/campaigns`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/pilot-campaigns-after-w0.png`, fullPage: true });

  await page.goto(`${BASE}/ko/dev/ds`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/ds-preview-page.png`, fullPage: true });

  await page.goto(`${BASE}/ko/my/plan/saved`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/regression-saved-snapshots.png`, fullPage: true });

  await browser.close();
  console.log("screenshots in", OUT);
  console.log("console errors", errors.length ? errors.slice(0, 5) : "none");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
