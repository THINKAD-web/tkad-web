#!/usr/bin/env node
/**
 * C-full-3a QA — DB 카탈로그로 Step 3 시드 후 브라우저·PDF 검증.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

globalThis.require = createRequire(import.meta.url);

const { fetchPlannerMediaCatalog } = await import(
  "../lib/public-media-catalog.ts"
);
const { buildOohReportPayload } = await import(
  "../lib/planner-report-export/payload-ooh.ts"
);
const { buildPlannerReportPdf } = await import(
  "../lib/planner-report-export/build-pdf.ts"
);
const { buildPlannerReportPptx } = await import(
  "../lib/planner-report-export/build-pptx.ts"
);
const { buildReportBudgetHonesty } = await import(
  "../lib/planner/report-budget-honesty.ts"
);
const { isQuoteOnlyMedia } = await import("../lib/media-pricing-mode.ts");
const { plannerMediaPeriodLineWon } = await import(
  "../lib/planner/planner-media-quantity.ts"
);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "scripts/.verify-c-full-3a-qa";
const EMAIL = process.env.QA_SEED_EMAIL ?? process.env.QA_EMAIL;
const PASSWORD = process.env.QA_SEED_PASSWORD ?? process.env.QA_PASSWORD;

const results = [];

function log(check, ok, detail = "") {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${check}${detail ? ` — ${detail}` : ""}`);
}

await mkdir(OUT, { recursive: true });

const { catalog } = await fetchPlannerMediaCatalog();
const priced = catalog.find(
  (m) => !isQuoteOnlyMedia(m) && (m.price ?? 0) > 0,
);
const quoteOnly = catalog.filter((m) => isQuoteOnlyMedia(m)).slice(0, 2);
if (!priced || quoteOnly.length === 0) {
  console.error("Need priced + quote_only media in catalog");
  process.exit(1);
}

const portfolio = [priced, ...quoteOnly];
const quantities = Object.fromEntries(portfolio.map((m) => [m.id, 1]));
const periodCtx = { months: 1 };
const pricing = { quantities };
const mixWon = portfolio
  .filter((m) => !isQuoteOnlyMedia(m))
  .reduce(
    (sum, m) =>
      sum + plannerMediaPeriodLineWon(m, periodCtx, pricing, true),
    0,
  );

const budgetHonesty = buildReportBudgetHonesty({
  requestWon: 30_000_000,
  portfolio,
  pricing,
  periodCtx,
  isKo: true,
  confirmedMixWon: mixWon,
});

const payload = buildOohReportPayload({
  isKo: true,
  goalTitle: "인지",
  budgetMan: 3000,
  periodDisplay: "2026-09-01 ~ 2026-09-30 (30일)",
  regionsText: "서울",
  categoriesText: "테스트",
  ageText: "20–30대",
  industryText: "F&B",
  portfolio,
  metrics: null,
  blendedCpmKrw: 5000,
  budgetAllocation: [
    {
      key: priced.type,
      label: priced.type,
      pct: 100,
      valueWon: mixWon,
      actualWon: mixWon,
    },
  ],
  cpmBars: [],
  effectSummaryLines: [],
  generatedAt: "2026-08-24",
  months: 1,
  campaignMediaQuantities: quantities,
  productionCostWon: 5_000_000,
  budgetHonesty,
});

log("payload.quoteSummary exists", Boolean(payload.quoteSummary));
log(
  "매체비 = budgetHonesty.mixWon",
  payload.quoteSummary?.supplyWon === budgetHonesty.mixWon,
  `${payload.quoteSummary?.supplyWon} vs ${budgetHonesty.mixWon}`,
);
log(
  "협의가 총액 라벨",
  payload.quoteSummary?.totalLabel === "합계 (부가세 포함 · 협의 매체 제외)",
  payload.quoteSummary?.totalLabel,
);
log(
  "협의가 각주",
  Boolean(payload.quoteSummary?.footnotes[0]?.includes("별도 협의 후 추가")),
  payload.quoteSummary?.footnotes[0],
);
log(
  "협의가 별도 행",
  Boolean(payload.quoteSummary?.quoteOnlyLine),
  payload.quoteSummary?.quoteOnlyLine?.label,
);

const pdfBytes = await buildPlannerReportPdf(payload, {});
log("PDF 생성", pdfBytes.length > 50_000, `${pdfBytes.length} bytes`);
await writeFile(join(OUT, "sample.pdf"), pdfBytes);

const pptxBytes = await buildPlannerReportPptx(payload, {});
log("PPTX 생성", pptxBytes.length > 1000, `${pptxBytes.length} bytes`);
await writeFile(join(OUT, "sample.pptx"), pptxBytes);

const briefSeed = {
  state: {
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    regionCodes: ["11"],
    genders: ["female"],
    ageBands: ["20s", "30s"],
    goal: "awareness",
    industry: "fb",
    flightStart: "2026-09-01",
    flightEnd: "2026-09-30",
    freeText: "",
    wizardStep: 3,
    entryMode: "direct",
    channelMode: "ooh",
    digitalBudgetPct: 20,
    digitalChannelIds: [],
    mixUnits: quantities,
    mixBriefFingerprint: "qa-fingerprint",
    budgetWithinOnly: true,
  },
  version: 0,
};

const reportCopySeed = {
  state: {
    clientName: "QA 브랜드",
    documentTitle: "QA 제안서",
    coverLogoUrl: null,
    greeting: "",
    executiveSummary: "",
    greetingTouched: false,
    executiveSummaryTouched: false,
    copyFingerprint: null,
    productionCostWon: 5_000_000,
  },
  version: 2,
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1400, height: 1000 },
});
const page = await context.newPage();

if (EMAIL && PASSWORD) {
  const loginRes = await context.request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  log("login", loginRes.ok(), EMAIL);
} else {
  log("login", false, "no QA credentials in env");
}

await page.addInitScript(
  ({ brief, copy }) => {
    localStorage.setItem("tkad-planner-brief-v1", JSON.stringify(brief));
    localStorage.setItem("tkad-report-copy-v1", JSON.stringify(copy));
  },
  { brief: briefSeed, copy: reportCopySeed },
);

await page.goto(`${BASE}/ko/planner`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForTimeout(8000);

await page.screenshot({
  path: join(OUT, "01-step3-seeded.png"),
  fullPage: true,
});

const prodInput = page.locator("#brief-production-cost");
log("제작비 입력란", (await prodInput.count()) > 0);
const prodValue = await prodInput.inputValue().catch(() => "");
log("제작비 시드 값", prodValue === "5000000", prodValue);

const quoteTable = page.locator('[data-testid="report-quote-summary"]');
const quoteVisible = (await quoteTable.count()) > 0;
log("견적 표 렌더", quoteVisible);

if (quoteVisible) {
  const coverMatch = await page
    .getByText(/확정 ₩[\d,]+/)
    .first()
    .textContent()
    .catch(() => "");
  const coverWon = coverMatch?.match(/₩([\d,]+)/)?.[1]?.replace(/,/g, "");
  const mediaText = await quoteTable
    .locator("tr")
    .filter({ hasText: /매체비/ })
    .locator("td")
    .textContent();
  const mediaWon = mediaText?.match(/₩([\d,]+)/)?.[1]?.replace(/,/g, "");
  log(
    "표지 확정 = 매체비",
    coverWon === mediaWon && coverWon != null,
    `cover=${coverWon} media=${mediaWon}`,
  );

  const totalLabel = await quoteTable
    .locator("th")
    .filter({ hasText: /합계|총액/ })
    .textContent();
  log("총액 라벨 (UI)", totalLabel?.includes("협의 매체 제외") ?? false, totalLabel?.trim());

  const footnote = await page
    .locator('[data-testid="report-quote-summary-footnote"]')
    .first()
    .textContent()
    .catch(() => "");
  log("각주 (UI)", footnote?.includes("별도 협의 후 추가") ?? false, footnote?.trim());

  await page.screenshot({
    path: join(OUT, "02-quote-with-quote-only.png"),
    fullPage: false,
  });

  await prodInput.fill("");
  await page.waitForTimeout(800);
  const prodZero = await quoteTable
    .locator("tr")
    .filter({ hasText: /제작비/ })
    .locator("td")
    .textContent();
  log("제작비 0 → — 표시", prodZero?.includes("—") ?? false, prodZero?.trim());
  await page.screenshot({
    path: join(OUT, "03-production-zero.png"),
    fullPage: false,
  });

  if (EMAIL && PASSWORD) {
    await prodInput.fill("3000000");
    const saveBtn = page
      .getByRole("button", { name: /플랜 저장|다시 저장|Save plan/i })
      .first();
    if (await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(8000);
      const url = page.url();
      log("플랜 저장 URL", /plan=/.test(url), url);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(8000);
      const persisted = await prodInput.inputValue();
      log("재접속 제작비 유지", persisted === "3000000", persisted);
      await page.screenshot({
        path: join(OUT, "04-reload-persisted.png"),
        fullPage: true,
      });
    }
  }
} else {
  await page.screenshot({
    path: join(OUT, "02-gated-or-missing.png"),
    fullPage: true,
  });
  log("견적 표 렌더", false, "preview gated or no mix render");
}

await browser.close();

const report = {
  at: new Date().toISOString(),
  base: BASE,
  mixWon,
  quoteOnlyCount: quoteOnly.length,
  pricedMediaId: priced.id,
  quoteOnlyIds: quoteOnly.map((m) => m.id),
  results,
  pass: results.filter((r) => !r.check.startsWith("login")).every((r) => r.ok),
};
await writeFile(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`\nArtifacts: ${OUT}/`);
console.log(`Pass: ${report.pass}`);
process.exit(report.pass ? 0 : 1);
