#!/usr/bin/env npx tsx
/**
 * PR5-b wizard commit 2 — calculable selectable, sidebar=export parity smoke.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { calculateQuote } from "../lib/quote-calculator.ts";
import {
  buildQuoteWizardOnlineLineContext,
  defaultQuoteWizardOnlineBudgetWon,
} from "../lib/quote-wizard-pricing.ts";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "https://tkad.co.kr").replace(/\/$/, "");
const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../lib/pricing/__tests__/golden/pr5-online-budget-snapshot.json",
);

async function main() {
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  const sample = golden.media.find((m) => m.slug === "google-ads-search");
  const budgetWon = sample?.onlineSpec?.minBudget ?? 1_000_000;

  const media = {
    id: sample.id,
    name: sample.name,
    nameEn: sample.name,
    location: sample.location,
    locationEn: sample.location,
    region: "online",
    type: "",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogChannel: "online",
    onlineSpec: sample.onlineSpec,
  };

  const client = buildQuoteWizardOnlineLineContext(media, budgetWon, {
    isKo: true,
    campaignPeriodLabel: "30일",
    campaignDays: 30,
  });
  const clientLineWon = Math.round(client.lineTotalMan * 10_000);

  const server = calculateQuote({
    media: [sample],
    startDate: new Date(golden.startDate),
    endDate: new Date(golden.endDate),
    discountRate: 0,
    mediaSelections: [
      {
        mediaId: sample.id,
        priceOptionIndex: 0,
        optionLabel: null,
        optionPriceWon: budgetWon,
        lineTotalWon: budgetWon,
      },
    ],
  });

  const parityOk = clientLineWon === server.lines[0]?.lineSupplyWon;
  const defaultOk =
    defaultQuoteWizardOnlineBudgetWon(media) === sample.onlineSpec.minBudget;

  const apiRes = await fetch(
    `${BASE}/api/public/media?catalogChannel=online&limit=25`,
    { cache: "no-store" },
  );
  const rows = (await apiRes.json()).data ?? [];
  const calc = rows.find((r) => r.slug === "google-ads-search");
  const quoteHtml = await fetch(`${BASE}/ko/quote?media=${calc?.id ?? ""}`, {
    cache: "no-store",
  }).then((r) => r.text());

  const deeplinkPreselect =
    quoteHtml.includes("selectedIds") ||
    (calc?.name && quoteHtml.split(calc.name).length > 3);
  const hasStep2Budget = quoteHtml.includes("온라인 월 예산");
  const hasMixedHint = quoteHtml.includes("OOH 매체는 아래 집행 기간");

  console.log("=== wizard commit 2 verify ===");
  console.log(`client lineWon: ${clientLineWon}`);
  console.log(`server lineSupplyWon: ${server.lines[0]?.lineSupplyWon}`);
  console.log(`sidebar=export parity (unit): ${parityOk ? "PASS" : "FAIL"}`);
  console.log(`default budget = minBudget (${budgetWon}): ${defaultOk ? "PASS" : "FAIL"}`);
  console.log(`deeplink pre-select calculable: ${deeplinkPreselect ? "yes" : "no"}`);
  console.log(`step2 budget section in HTML: ${hasStep2Budget}`);

  const pass = parityOk && defaultOk && calc?.id && !deeplinkPreselect;
  console.log(pass ? "PASS wizard commit 2" : "FAIL wizard commit 2");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
