#!/usr/bin/env node
/**
 * Reproduce 재한님 flow: edit overrides → save → preview (and POST+reload race).
 */
import { chromium } from "playwright";
import { config } from "dotenv";
import {
  clickSaveAndWaitForReportId,
  fillKpiLabel,
  goToPreview,
  waitForBuilderReady,
} from "./builder-browser-helpers.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "thinkad2024")
).trim();

const KPI_LABEL = "수동재현 KPI 라벨 2026";
const PACING_SUB = "수동재현 페이스 소제목 2026";

async function login(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    data: { username: "admin", password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  await login(context);
  const page = await context.newPage();
  const results = [];

  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2`, { waitUntil: "domcontentloaded" });
  await waitForBuilderReady(page);
  await page.getByRole("button", { name: "새로" }).click();
  await page.locator('label:text("제목") input').first().fill("override persistence test");
  await page.locator("section").filter({ hasText: "디지털 채널" }).first()
    .getByRole("button", { name: "추가" }).first().click();

  let capturedSaveBody = null;
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/admin/campaign-builder/reports")) {
      capturedSaveBody = req.postDataJSON();
    }
  });

  await page.getByTestId("builder-kpi-card-totalBudget").locator('input[type="text"]').fill(KPI_LABEL);
  await page.getByTestId("builder-insight-subtitle-pacing").fill(PACING_SUB);

  const save = await clickSaveAndWaitForReportId(page);
  await page.waitForTimeout(2000);

  results.push({
    step: "A POST save body has kpiCards override",
    ok: Boolean(capturedSaveBody?.insightsOverride?.kpiCards?.some((k) => k.labelOverride === KPI_LABEL)),
    detail: JSON.stringify(capturedSaveBody?.insightsOverride?.kpiCards?.slice(0, 2)),
  });
  results.push({
    step: "A POST save body has insightSubtitles.pacing",
    ok: capturedSaveBody?.insightsOverride?.insightSubtitles?.pacing === PACING_SUB,
    detail: capturedSaveBody?.insightsOverride?.insightSubtitles?.pacing,
  });

  const getAfterSave = await context.request.get(
    `${BASE}/api/admin/campaign-builder/reports/${save.reportId}`,
    { credentials: "include" },
  );
  const stored = (await getAfterSave.json()).payload;
  results.push({
    step: "A GET after POST retains kpi override",
    ok: stored?.insightsOverride?.kpiCards?.some((k) => k.labelOverride === KPI_LABEL) === true,
  });
  results.push({
    step: "A GET after POST retains pacing subtitle",
    ok: stored?.insightsOverride?.insightSubtitles?.pacing === PACING_SUB,
  });

  const kpiInputVal = await page.getByTestId("builder-kpi-card-totalBudget").locator('input[type="text"]').inputValue();
  const pacingInputVal = await page.getByTestId("builder-insight-subtitle-pacing").inputValue();
  results.push({
    step: "A UI KPI input after save+reload",
    ok: kpiInputVal === KPI_LABEL,
    detail: kpiInputVal,
  });
  results.push({
    step: "A UI pacing input after save+reload",
    ok: pacingInputVal === PACING_SUB,
    detail: pacingInputVal,
  });

  await goToPreview(page, BASE, save.reportId);
  const previewText = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "A preview shows custom KPI label",
    ok: previewText.includes(KPI_LABEL),
  });
  results.push({
    step: "A preview shows custom pacing subtitle",
    ok: previewText.includes(PACING_SUB),
  });

  const KPI2 = "수동재현KPIPATCH2026";
  const PACING2 = "수동재현 PATCH 페이스 2026";
  await page.goto(`${BASE}/ko/admin/reports?type=builder&step=2&id=${save.reportId}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForBuilderReady(page);

  const kpiInput = page
    .getByTestId("builder-kpi-card-totalBudget")
    .locator('input[type="text"]');
  await fillKpiLabel(page, "totalBudget", KPI2);
  const pacingInput = page.getByTestId("builder-insight-subtitle-pacing");
  await pacingInput.fill(PACING2);

  results.push({
    step: "B UI KPI input before PATCH",
    ok: (await kpiInput.inputValue()) === KPI2,
    detail: await kpiInput.inputValue(),
  });

  let patchBody = null;
  const save2 = await (async () => {
    const waitPatch = page.waitForResponse(
      (res) =>
        res.request().method() === "PATCH" &&
        res.url().includes(`/api/admin/campaign-builder/reports/${save.reportId}`) &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 60_000 },
    );
    await page
      .locator('[data-testid="campaign-builder-track"]')
      .getByRole("button", { name: /^저장/ })
      .click();
    const res = await waitPatch;
    try {
      patchBody = res.request().postDataJSON();
    } catch {
      patchBody = null;
    }
    return res;
  })();
  await page.waitForTimeout(1000);

  results.push({
    step: "B PATCH response received",
    ok: save2.ok(),
    detail: String(save2.status()),
  });
  results.push({
    step: "B PATCH body has kpi override",
    ok: patchBody?.insightsOverride?.kpiCards?.some((k) => k.labelOverride === KPI2) === true,
    detail: JSON.stringify(patchBody?.insightsOverride?.kpiCards),
  });
  results.push({
    step: "B PATCH body has pacing subtitle",
    ok: patchBody?.insightsOverride?.insightSubtitles?.pacing === PACING2,
    detail: patchBody?.insightsOverride?.insightSubtitles?.pacing,
  });

  await goToPreview(page, BASE, save.reportId);
  const preview2 = await page.getByTestId("campaign-builder-report-preview").innerText();
  results.push({
    step: "B preview after PATCH",
    ok: preview2.includes(KPI2) && preview2.includes(PACING2),
    detail: `kpi=${preview2.includes(KPI2)} pacing=${preview2.includes(PACING2)}`,
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
