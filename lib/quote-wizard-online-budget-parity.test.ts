import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculateQuote } from "@/lib/quote-calculator";
import {
  buildQuoteWizardOnlineLineContext,
  shouldUseOnlineWizardBudgetLine,
} from "@/lib/quote-wizard-pricing";
import type { QuoteCalculatorMediaWithOnline } from "@/lib/pricing/strategy-types";

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "pricing/__tests__/golden/pr5-online-budget-snapshot.json",
);

type GoldenSnapshot = {
  media: QuoteCalculatorMediaWithOnline[];
  expected: Array<{
    mediaId: string;
    scenario: string;
    budgetWon: number;
    lineSupplyWon: number;
    totalWon: number;
  }>;
  startDate: string;
  endDate: string;
};

function loadGolden(): GoldenSnapshot {
  return JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenSnapshot;
}

function toMediaItem(m: QuoteCalculatorMediaWithOnline): MediaItem {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.name,
    location: m.location,
    locationEn: m.location,
    region: "online",
    type: m.type ?? "",
    price: m.price ?? 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogChannel: m.catalogChannel,
    onlineSpec: m.onlineSpec ?? undefined,
  };
}

test("PR5-b wizard parity — client lineTotalMan matches server lineSupplyWon (14×3)", () => {
  const golden = loadGolden();
  const mediaById = new Map(golden.media.map((m) => [m.id, m]));
  const startDate = new Date(golden.startDate);
  const endDate = new Date(golden.endDate);
  const mismatches: Array<Record<string, unknown>> = [];

  for (const exp of golden.expected) {
    const raw = mediaById.get(exp.mediaId);
    assert.ok(raw, exp.mediaId);
    const media = toMediaItem(raw);
    assert.equal(shouldUseOnlineWizardBudgetLine(media), true);

    const client = buildQuoteWizardOnlineLineContext(media, exp.budgetWon, {
      isKo: true,
      campaignPeriodLabel: "30일",
      campaignDays: 30,
    });

    const clientLineTotalWon = client.priceOnInquiry
      ? 0
      : Math.round(client.lineTotalMan * 10_000);

    const server = calculateQuote({
      media: [raw],
      startDate,
      endDate,
      discountRate: 0,
      mediaSelections: [
        {
          mediaId: exp.mediaId,
          priceOptionIndex: 0,
          optionLabel: null,
          optionPriceWon: exp.budgetWon,
          lineTotalWon: exp.budgetWon,
        },
      ],
    });

    const serverLineWon = server.lines[0]?.lineSupplyWon ?? 0;

    if (clientLineTotalWon !== serverLineWon) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        field: "lineSupplyWon",
        clientLineTotalWon,
        serverLineWon,
        clientLineTotalMan: client.lineTotalMan,
      });
    }
    if (clientLineTotalWon !== exp.lineSupplyWon) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        field: "golden.lineSupplyWon",
        clientLineTotalWon,
        expected: exp.lineSupplyWon,
      });
    }
    if (client.priceOnInquiry) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        field: "priceOnInquiry",
        expected: false,
        actual: true,
      });
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `client/server wizard parity mismatches: ${JSON.stringify(mismatches, null, 2)}`,
  );
});

test("PR5-b wizard parity — below-min budget is inquiry on client", () => {
  const golden = loadGolden();
  const raw = golden.media[0]!;
  const media = toMediaItem(raw);
  const belowMin = Math.max(1, (raw.onlineSpec?.minBudget ?? 1) - 1);
  const client = buildQuoteWizardOnlineLineContext(media, belowMin, {
    isKo: true,
    campaignPeriodLabel: "30일",
  });
  assert.equal(client.priceOnInquiry, true);
  assert.equal(client.lineTotalMan, 0);
});
