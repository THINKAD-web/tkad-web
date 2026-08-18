/**
 * R-1: 장바구니 경로 — 62%·4.5배 제거 + [산정 중] placeholder 검증.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MediaItem } from "@/lib/media-data";
import { buildPlanCartReportBundle } from "@/lib/plan-cart-report/build-report";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import { PLAN_CART_KEY } from "@/lib/plan-cart";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "reports", "screenshots-pr8-1a");

function buildPreviewHtml(payload: ReturnType<typeof buildOohReportPayload>): string {
  const kpis = payload.kpis
    .map((k) => {
      if (k.status === "pending") {
        return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb">
          <div style="font-size:11px;color:#6b7280">${k.label}</div>
          <div style="font-size:18px;font-weight:bold;color:#9ca3af">—</div>
          <div style="font-size:10px;font-weight:600;color:#71717a">[${k.badge === "pending" ? "산정 중" : k.badge}]</div>
          <div style="font-size:10px;color:#6b7280;margin-top:4px">${k.pendingHint ?? ""}</div>
        </div>`;
      }
      const badgeLabel =
        k.badge === "measured"
          ? "실측"
          : k.badge === "estimated"
            ? "추정"
            : k.badge === "benchmark"
              ? "벤치마크 기반"
              : "산정 중";
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb">
        <div style="font-size:11px;color:#6b7280">${k.label}</div>
        <div style="font-size:18px;font-weight:bold;color:#7c3aed">${k.value}</div>
        <div style="font-size:10px;font-weight:600;color:#b45309">[${badgeLabel}]</div>
      </div>`;
    })
    .join("");
  const strategy = payload.sections?.find((s) => s.title === "전략 요약");
  const strategyHtml = strategy
    ? `<ul>${strategy.lines.map((l) => `<li style="margin:4px 0;font-size:12px">${l}</li>`).join("")}</ul>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px">
<h1>장바구니 cart path KPI preview</h1>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${kpis}</div>
<h2 style="font-size:14px;margin-top:24px">전략 요약</h2>${strategyHtml}</body></html>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const res = await fetch(`${BASE}/api/public/media-catalog`, { cache: "no-store" });
  if (!res.ok) throw new Error("catalog fetch failed");
  const catalog = (await res.json()) as MediaItem[];
  const media = catalog[0];
  if (!media) throw new Error("empty catalog");

  const cart = {
    items: [{
      mediaId: media.id,
      mediaName: media.name,
      mediaType: media.type,
      region: media.region ?? "서울",
      price: media.price,
      quantity: 1,
    }],
    campaignGoal: "awareness" as const,
    totalBudget: 5000,
    duration: 1,
    updatedAt: new Date().toISOString(),
  };

  const bundle = buildPlanCartReportBundle({ cart, catalog, isKo: true });
  if (!bundle) throw new Error("null bundle");

  const payload = buildOohReportPayload({
    isKo: true,
    goalTitle: bundle.reportProps.goalTitle,
    budgetMan: bundle.reportProps.budgetNum,
    periodDisplay: "2026-08-01 ~ 2026-08-31",
    regionsText: bundle.reportProps.regionsText,
    categoriesText: bundle.reportProps.categoriesText,
    ageText: bundle.reportProps.ageText,
    industryText: bundle.reportProps.industryText,
    portfolio: bundle.reportProps.portfolio,
    metrics: bundle.reportProps.metrics,
    blendedCpmKrw: null,
    budgetAllocation: [],
    cpmBars: [],
    effectSummaryLines: [],
    generatedAt: new Date().toLocaleString("ko-KR"),
    months: 1,
  });

  const joined = JSON.stringify(payload);
  const has62 = joined.includes("62%");
  const has45 = /4\.5/.test(joined);
  const pendingCount = payload.kpis.filter((k) => k.status === "pending").length;
  const badgeCount = payload.kpis.filter((k) => k.badge != null).length;

  const htmlPath = path.join(OUT, "cart-kpi-preview.html");
  writeFileSync(htmlPath, buildPreviewHtml(payload));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  await page.goto(`file://${htmlPath}`);
  await page.screenshot({ path: path.join(OUT, "01-cart-kpi-pending.png"), fullPage: true });

  await page.goto(`${BASE}/ko/my/plan/report`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [PLAN_CART_KEY, JSON.stringify(cart)] as const);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, "02-my-plan-report-page.png"), fullPage: true });
  await browser.close();

  console.log(JSON.stringify({ has62, has45, pendingCount, badgeCount, kpiBadges: payload.kpis.map((k) => k.badge) }, null, 2));
  const pass = !has62 && !has45 && pendingCount >= 2 && badgeCount === payload.kpis.length;
  console.log(pass ? "\n✅ R-1 PASS" : "\n❌ R-1 FAIL");
  console.log(`Screenshots: ${OUT}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
