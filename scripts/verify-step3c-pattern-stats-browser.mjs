#!/usr/bin/env node
/**
 * STEP3c — pattern stats note browser + export verification.
 * Requires dev server with:
 *   PATTERN_STATS_NOTES_ENABLED=true
 *   NEXT_PUBLIC_PATTERN_STATS_NOTES_ENABLED=true
 *
 * Usage: BASE=http://127.0.0.1:3015 node scripts/verify-step3c-pattern-stats-browser.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { execSync } from "node:child_process";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3015").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "tmp/step3c-pattern-stats-verify");
const NOTE_SNIPPET = "비슷한 조건";
const PRO_USER_ID = "cmo6th4ef000004l4bjb4tj87";

const pdfTextShell = (pdfB64) => `<!DOCTYPE html><html><head><meta charset=utf-8>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head><body>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
(async()=>{
  const data=atob('${pdfB64}');
  const bytes=new Uint8Array(data.length);
  for(let i=0;i<data.length;i++) bytes[i]=data.charCodeAt(i);
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  let text='';
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);
    const tc=await page.getTextContent();
    text+=tc.items.map(i=>i.str).join(' ')+' ';
  }
  window.__pdfText=text;
})();
</script></body></html>`;

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

function createSessionCookie() {
  const out = execSync(
    `npx tsx -e "(async()=>{const { createUserSessionToken, createSessionRecord, USER_SESSION_COOKIE }=await import('./lib/user-session.ts');const userId='${PRO_USER_ID}';const token=createUserSessionToken(userId,'USER');if(!token)throw new Error('no token');await createSessionRecord({ userId, token });console.log(JSON.stringify({ name: USER_SESSION_COOKIE, value: token }));})().catch(e=>{console.error(e);process.exit(1);});"`,
    { cwd: process.cwd(), encoding: "utf8" },
  ).trim();
  return JSON.parse(out);
}

async function runPlannerToPreview(page) {
  await page.goto(`${BASE}/ko/planner?new=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-entry-mode="detailed"]', { timeout: 60_000 });
  await page.locator('[data-entry-mode="detailed"]').click();
  await page.getByRole("button", { name: "전환", exact: true }).click();

  const budget = page.locator('input[inputmode="numeric"]').first();
  await budget.fill("1667");
  await budget.press("Tab");
  await page.waitForTimeout(400);

  const start = page.locator('input[type="date"]').first();
  const end = page.locator('input[type="date"]').nth(1);
  if ((await start.count()) > 0) {
    await start.fill("2026-09-01");
    await end.fill("2026-09-30");
  }

  const nextBtn = page.getByRole("button", {
    name: "다음 · 믹스 편집",
    exact: true,
  });
  await page.waitForFunction(
    (btn) => btn && !btn.disabled,
    await nextBtn.elementHandle(),
    { timeout: 20_000 },
  );
  await nextBtn.click();
  await page.waitForSelector('[data-testid="brief-mix-list"]', { timeout: 120_000 });

  const mixAdd = page.locator('[data-testid="brief-mix-card-add"]').first();
  if ((await mixAdd.count()) > 0) {
    await mixAdd.click();
    await page.waitForTimeout(600);
  }

  const stepTwoNext = page.locator('[data-testid="brief-step-two-next"]');
  await page.waitForFunction(
    (btn) => btn && !btn.disabled,
    await stepTwoNext.elementHandle(),
    { timeout: 30_000 },
  );
  await stepTwoNext.click();
  await page.waitForSelector(
    '[data-testid="brief-result-summary"], [data-testid="brief-proposal-preview"]',
    { timeout: 120_000 },
  );
  await page.waitForTimeout(3000);
}

async function extractPdfText(page, pdfPath) {
  const bytes = await readFile(pdfPath);
  const htmlPath = path.join(OUT, "pdf-text.html");
  await writeFile(htmlPath, pdfTextShell(bytes.toString("base64")));
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(() => typeof window.__pdfText === "string", {
    timeout: 60_000,
  });
  return page.evaluate(() => window.__pdfText);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const session = createSessionCookie();
  const results = [];

  console.log(`\n=== STEP3c pattern stats verify BASE=${BASE} ===\n`);

  // --- Flag ON: planner preview + API ---
  if (process.env.VERIFY_FLAG_OFF !== "1") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "ko-KR",
      acceptDownloads: true,
    });
    await context.addCookies([
      {
        ...session,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    const lookupCalls = [];
    let lastExportPayload = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/pattern-stats/lookup")) {
        lookupCalls.push(req.method());
      }
      if (
        req.url().includes("/api/planner/report/export") &&
        req.method() === "POST"
      ) {
        try {
          lastExportPayload = req.postDataJSON()?.payload ?? null;
        } catch {
          /* ignore */
        }
      }
    });

    await runPlannerToPreview(page);
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('[data-testid="brief-proposal-preview"]').innerText();
    const noteVisible = bodyText.includes(NOTE_SNIPPET) && /28/.test(bodyText);
    console.log("1. planner preview note visible:", noteVisible);
    console.log("   lookup calls:", lookupCalls.length);
    results.push({
      step: "flag-on-planner-note",
      ok: noteVisible && lookupCalls.length >= 1,
      detail: `note=${noteVisible}, lookups=${lookupCalls.length}`,
    });
    await page.screenshot({
      path: path.join(OUT, "flag-on-planner-preview.png"),
      fullPage: true,
    });

    // PDF export (same planner session)
    const keepEdits = page.getByRole("button", { name: /편집 유지|Keep edits/i });
    if (await keepEdits.isVisible().catch(() => false)) {
      await keepEdits.click();
      await page.waitForTimeout(500);
    }
    await page.keyboard.press("Escape").catch(() => {});
    const pdfBtn = page.getByRole("button", { name: /PDF/i }).first();
    await pdfBtn.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /PDF/i.test(b.textContent ?? ""),
        );
        return btn && !btn.disabled;
      },
      { timeout: 90_000 },
    );
    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await pdfBtn.click();
    const download = await downloadPromise;
    const pdfPath = path.join(OUT, "pattern-stats-export.pdf");
    await download.saveAs(pdfPath);
    const pdfText = await extractPdfText(page, pdfPath);
    const pdfHasNote = pdfText.includes(NOTE_SNIPPET) && /28/.test(pdfText);
    console.log("3. PDF contains pattern note:", pdfHasNote);
    results.push({
      step: "flag-on-pdf",
      ok: pdfHasNote,
      detail: pdfHasNote ? "28건 phrase found" : "missing",
    });

    // PPTX export — brief step3 UI is PDF-only; reuse PDF payload for API export
    let pptxOk = false;
    if (lastExportPayload) {
      const pptxRes = await context.request.post(
        `${BASE}/api/planner/report/export`,
        {
          data: { format: "pptx", payload: lastExportPayload },
        },
      );
      const pptxPath = path.join(OUT, "pattern-stats-export.pptx");
      const pptxBuf = await pptxRes.body();
      await import("node:fs/promises").then((fs) => fs.writeFile(pptxPath, pptxBuf));
      const pptxText = pptxBuf.toString("utf8", 0, Math.min(pptxBuf.length, 500_000));
      pptxOk =
        pptxRes.ok() &&
        pptxBuf.length > 10_000 &&
        pptxText.includes(NOTE_SNIPPET);
      console.log("4. PPTX export (API):", pptxOk, "bytes:", pptxBuf.length);
    } else {
      console.log("4. PPTX skipped — no export payload captured");
    }
    results.push({
      step: "flag-on-pptx",
      ok: pptxOk,
      detail: pptxOk ? "pptx contains pattern note" : "failed or no payload",
    });

    // Recommend — API called; note may be null (recommend source, no aggregate row yet)
    await page.goto(`${BASE}/ko/recommend`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.evaluate(() => sessionStorage.removeItem("tkad_recommend_session_v2"));
    const fresh = page.getByRole("button", { name: "새로 시작" });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await page.getByRole("button", { name: "구조화 입력" }).click();
    await page.getByRole("button", { name: "실적·전환" }).click();
    await page.locator("label").filter({ hasText: /^서울$/ }).click();
    const slider = page.locator('input[type="range"]').first();
    await slider.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, "500");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.getByRole("button", { name: "AI 분석 시작" }).click();
    const recLookupBefore = lookupCalls.length;
    await page
      .waitForSelector(
        '[data-testid="recommend-online-mix-section"], [data-testid="recommend-report-section"]',
        { timeout: 240_000 },
      )
      .catch(() => null);
    await page.waitForTimeout(2000);
    const recLookups = lookupCalls.length - recLookupBefore;
    const recText = await page.locator("body").innerText();
    const recNote = recText.includes(NOTE_SNIPPET);
    console.log("4. recommend lookup calls:", recLookups, "note visible:", recNote);
    results.push({
      step: "flag-on-recommend-api",
      ok: recLookups >= 1,
      detail: `lookups=${recLookups}, note=${recNote} (recommend source may have no row)`,
    });

    await context.close();
  }

  // --- Flag OFF (restart dev with flags false) ---
  if (process.env.VERIFY_FLAG_OFF === "1") {
    const context = await browser.newContext({ locale: "ko-KR" });
    const page = await context.newPage();
    const lookupCalls = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/pattern-stats/lookup")) lookupCalls.push(req.url());
    });
    await runPlannerToPreview(page);
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('[data-testid="brief-proposal-preview"]').innerText();
    const noteVisible = bodyText.includes(NOTE_SNIPPET);
    console.log("5. flag-off note absent:", !noteVisible);
    console.log("   flag-off lookup calls:", lookupCalls.length);
    results.push({
      step: "flag-off-no-network",
      ok: !noteVisible && lookupCalls.length === 0,
      detail: `note=${noteVisible}, lookups=${lookupCalls.length}`,
    });
    await context.close();
  } else {
    console.log("\n(Skip flag-off browser pass — run VERIFY_FLAG_OFF=1 after restarting dev without flags)");
  }

  await browser.close();

  const report = { base: BASE, at: new Date().toISOString(), results };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.step} — ${r.detail}`);
  }

  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
