#!/usr/bin/env npx tsx
/** Verify cart order → report portfolio order (강남→역삼→선릉) */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
(globalThis as typeof globalThis & { require?: NodeRequire }).require = require;

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const NEEDLES = ["강남역", "역삼역", "선릉역"];

async function main() {
  const { fetchPlannerMediaCatalog } = await import(
    "../lib/public-media-catalog.ts"
  );
  const { buildPlanCartReportBundle } = await import(
    "../lib/plan-cart-report/build-report.ts"
  );
  const { buildOohReportPayload } = await import(
    "../lib/planner-report-export/payload-ooh.ts"
  );
  type PlanCart = import("../lib/plan-cart.ts").PlanCart;

  const { catalog } = await fetchPlannerMediaCatalog();
  const picks = NEEDLES.map((needle) => {
    const hit =
      catalog.find(
        (m) =>
          m.name.includes(needle) &&
          (m.name.includes("엔스퀘어") || m.name.includes("Ensquare")),
      ) ??
      catalog.find((m) => m.name.includes(needle));
    if (!hit) throw new Error(`catalog miss: ${needle}`);
    return hit;
  });

  function cartWithOrder(ids: string[]): PlanCart {
    return {
      items: ids.map((id, i) => {
        const m = catalog.find((c) => c.id === id)!;
        return {
          mediaId: id,
          mediaName: m.name,
          mediaType: m.type,
          region: m.location ?? "",
          price: m.price,
          addedFrom: "search" as const,
          addedAt: new Date(Date.now() + i).toISOString(),
        };
      }),
      duration: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  const idsForward = picks.map((m) => m.id);
  const cartForward = cartWithOrder(idsForward);
  const bundleForward = buildPlanCartReportBundle({
    cart: cartForward,
    catalog,
    isKo: true,
  });
  if (!bundleForward) throw new Error("bundle null");

  const forwardNames = bundleForward.reportProps.portfolio.map((m) => m.name);
  console.log("=== forward (강남→역삼→선릉) ===");
  console.log(forwardNames.map((n) => n.replace(/ 광고$/, "")).join(" → "));

  const idsReversed = [...idsForward].reverse();
  const cartReversed = cartWithOrder(idsReversed);
  const bundleReversed = buildPlanCartReportBundle({
    cart: cartReversed,
    catalog,
    isKo: true,
  });
  if (!bundleReversed) throw new Error("bundle reversed null");

  const reversedNames = bundleReversed.reportProps.portfolio.map((m) => m.name);
  console.log("\n=== reversed (선릉→역삼→강남, drag sim) ===");
  console.log(reversedNames.map((n) => n.replace(/ 광고$/, "")).join(" → "));

  const payload = buildOohReportPayload({
    isKo: true,
    goalTitle: "브랜드 인지도",
    budgetMan: 1000,
    periodDisplay: "1개월",
    regionsText: "서울",
    categoriesText: "디지털",
    ageText: "전 연령",
    industryText: "기타",
    portfolio: bundleForward.reportProps.portfolio,
    metrics: bundleForward.reportProps.metrics,
    blendedCpmKrw: null,
    budgetAllocation: [],
    cpmBars: [],
    effectSummaryLines: [],
    months: 1,
    regionBreakdown: bundleForward.regionalBreakdown,
    planCartItems: cartForward.items,
  });

  const pdfOrder = payload.portfolio.map((r) => r.name);
  console.log("\n=== PDF payload portfolio ===");
  console.log(pdfOrder.map((n) => n.replace(/ 광고$/, "")).join(" → "));

  const okForward =
    forwardNames[0]?.includes("강남") &&
    forwardNames[1]?.includes("역삼") &&
    forwardNames[2]?.includes("선릉");
  const okReversed =
    reversedNames[0]?.includes("선릉") &&
    reversedNames[1]?.includes("역삼") &&
    reversedNames[2]?.includes("강남");
  const okPdf =
    pdfOrder[0]?.includes("강남") &&
    pdfOrder[1]?.includes("역삼") &&
    pdfOrder[2]?.includes("선릉");

  console.log("\n=== ASSERT ===");
  console.log({ okForward, okReversed, okPdf });
  if (!okForward || !okReversed || !okPdf) process.exit(1);
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
