#!/usr/bin/env node
/**
 * PR2 Phase 1 — golden baseline from CURRENT calculateQuote (recompute).
 * Does not change production pricing. Writes reports/pr2-golden-baseline.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateQuote } from "../../lib/quote-calculator.ts";
import { BUDGET_PRICING_NOT_IMPLEMENTED } from "../../lib/pricing/budget-pricing.ts";
import { QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE } from "../../lib/pricing/fixed-period-pricing.ts";
import type { QuoteCalculatorMedia } from "../../lib/pricing/strategy-types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const EXISTING_GOLDEN = join(
  root,
  "lib/pricing/__tests__/golden/pr2-quote-snapshot.json",
);
const OUT = join(root, "reports/pr2-golden-baseline.json");

const CLASSIFIED = [
  "cmr9xedzi000a04layhba2ulc",
  "cmrap3eo4000004jv8b2tt90v",
  "cmrn711g8000404ib3hct4qpy",
  "cmtd4wpic000004ic5oeqzdxq",
] as const;

const CORE_SCENARIOS = [
  { name: "calendar_14d", periodKey: undefined as string | undefined },
  { name: "wizard_14days", periodKey: "14days" },
  { name: "wizard_1month", periodKey: "1month" },
] as const;

const ISSUED_AT = new Date("2026-03-01T00:00:00.000Z");
const CORE_START = new Date("2026-03-01T00:00:00.000Z");
const CORE_END = new Date("2026-03-14T00:00:00.000Z");

const TIER_PERIOD_KEYS = [
  "1day",
  "3days",
  "5days",
  "7days",
  "15days",
  "30days",
] as const;

type ExistingGolden = {
  sampleIds: string[];
  media: QuoteCalculatorMedia[];
  expected: Array<{
    mediaId: string;
    scenario: string;
    totalWon: number;
    lineSupplyWon: number | null;
  }>;
};

function snapQuote(
  media: QuoteCalculatorMedia[],
  opts: {
    startDate: Date;
    endDate: Date;
    periodKey?: string;
    mediaPriceOptionIndex?: Record<string, number>;
  },
) {
  const q = calculateQuote({
    media,
    startDate: opts.startDate,
    endDate: opts.endDate,
    discountRate: 0,
    issuedAt: ISSUED_AT,
    periodKey: opts.periodKey,
    mediaPriceOptionIndex: opts.mediaPriceOptionIndex,
  });
  const line = q.lines[0];
  return {
    totalWon: q.totalWon,
    supplyWon: q.supplyWon,
    vatWon: q.vatWon,
    periodDays: q.periodDays,
    lineSupplyWon: line?.lineSupplyWon ?? null,
    unitPriceWon: line?.unitPriceWon ?? null,
    linePeriodDays: line?.periodDays ?? null,
  };
}

function catchCode(fn: () => void): string {
  try {
    fn();
    return "NO_THROW";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith(BUDGET_PRICING_NOT_IMPLEMENTED)) {
      return BUDGET_PRICING_NOT_IMPLEMENTED;
    }
    if (msg.startsWith(QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE)) {
      return QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE;
    }
    return msg.slice(0, 120);
  }
}

function main() {
  const existing = JSON.parse(
    readFileSync(EXISTING_GOLDEN, "utf8"),
  ) as ExistingGolden;
  const mediaById = new Map(existing.media.map((m) => [m.id, m]));
  const sampleIds = existing.sampleIds;
  if (sampleIds.length !== 34) {
    throw new Error(`expected 34 sampleIds, got ${sampleIds.length}`);
  }

  const coreExpected: Record<string, unknown>[] = [];
  const vsExisting: Record<string, unknown>[] = [];
  for (const mediaId of sampleIds) {
    const media = mediaById.get(mediaId);
    if (!media) throw new Error(`missing fixture ${mediaId}`);
    for (const sc of CORE_SCENARIOS) {
      const actual = snapQuote([media], {
        startDate: CORE_START,
        endDate: CORE_END,
        periodKey: sc.periodKey,
        mediaPriceOptionIndex: {},
      });
      coreExpected.push({
        mediaId,
        scenario: sc.name,
        periodKey: sc.periodKey ?? null,
        classified: CLASSIFIED.includes(mediaId as (typeof CLASSIFIED)[number]),
        catalogChannel: media.catalogChannel ?? null,
        ...actual,
      });
      const prev = existing.expected.find(
        (e) => e.mediaId === mediaId && e.scenario === sc.name,
      );
      if (prev && prev.totalWon !== actual.totalWon) {
        vsExisting.push({
          mediaId,
          scenario: sc.name,
          previousTotalWon: prev.totalWon,
          currentTotalWon: actual.totalWon,
        });
      }
    }
  }

  const anchor = mediaById.get("cmox1l6tx000204kysagmp1v8");
  if (!anchor) throw new Error("missing anchor media cmox1l6tx000204kysagmp1v8");

  const partialAnchor: QuoteCalculatorMedia = {
    ...anchor,
    id: "synthetic-partial-tier-anchor",
    name: "synthetic partial-rate tier anchor",
    catalogChannel: "offline",
    price: 10_000_000,
    priceOptions: [
      {
        label: "월 패키지",
        price: 10_000_000,
        period: "month",
      },
    ],
    partialPeriodRates: {
      "1day": 0.08,
      "3days": 0.2,
      "5days": 0.3,
      "7days": 0.4,
      "15days": 0.55,
      "30days": 1,
    },
  };

  const zeroPrice: QuoteCalculatorMedia = {
    ...anchor,
    id: "synthetic-zero-price",
    name: "synthetic zero price",
    price: 0,
    priceOptions: [],
    catalogChannel: "offline",
  };

  const boundary: Record<string, unknown>[] = [];

  for (const periodKey of TIER_PERIOD_KEYS) {
    boundary.push({
      id: `wizard_tier_${periodKey}`,
      kind: "wizard_option_pricing",
      note:
        periodKey === "3days" || periodKey === "5days"
          ? "티어 경계 3↔5"
          : periodKey === "7days" || periodKey === "15days"
            ? "티어 경계 7↔15"
            : periodKey === "1day"
              ? "최소 기간 키"
              : "최대 기간 키",
      periodKey,
      mediaId: partialAnchor.id,
      ...snapQuote([partialAnchor], {
        startDate: CORE_START,
        endDate: CORE_END,
        periodKey,
        mediaPriceOptionIndex: {},
      }),
    });
  }

  const calendarInteriors: Array<{
    id: string;
    days: number;
    end: string;
    note: string;
  }> = [
    { id: "calendar_1d_min", days: 1, end: "2026-03-01", note: "최소 기간 1일" },
    {
      id: "calendar_4d_between_3_5",
      days: 4,
      end: "2026-03-04",
      note: "보간 구간 내부 3↔5 (캘린더 days/30, 부분요율 lookup 없음)",
    },
    {
      id: "calendar_6d_between_5_7",
      days: 6,
      end: "2026-03-06",
      note: "보간 구간 내부 5↔7",
    },
    {
      id: "calendar_11d_between_7_15",
      days: 11,
      end: "2026-03-11",
      note: "보간 구간 내부 7↔15",
    },
    {
      id: "calendar_30d_max",
      days: 30,
      end: "2026-03-30",
      note: "최대 기간 30일",
    },
  ];

  for (const row of calendarInteriors) {
    boundary.push({
      id: row.id,
      kind: "calendar_proration",
      note: row.note,
      periodKey: null,
      calendarDays: row.days,
      mediaId: partialAnchor.id,
      ...snapQuote([partialAnchor], {
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date(`${row.end}T00:00:00.000Z`),
      }),
    });
  }

  boundary.push({
    id: "price_zero",
    kind: "zero_price",
    note: "단가 0원 — catalogPriceFieldToWon(0)=0",
    mediaId: zeroPrice.id,
    ...snapQuote([zeroPrice], {
      startDate: CORE_START,
      endDate: CORE_END,
    }),
  });

  const throws = [
    {
      id: "online_budget_stub",
      note: "catalogChannel=online → BudgetPricing throw (PR3 seed 전 미사용)",
      catalogChannel: "online",
      type: null,
      price: null,
      expectedCode: BUDGET_PRICING_NOT_IMPLEMENTED,
      actualCode: catchCode(() => {
        snapQuote(
          [
            {
              id: "synthetic-online",
              name: "synthetic online",
              location: "",
              type: null,
              catalogChannel: "online",
              price: 0,
            },
          ],
          { startDate: CORE_START, endDate: CORE_END },
        );
      }),
    },
    {
      id: "offline_null_type",
      note: "offline + type null → FixedPeriodPricing display-type throw",
      catalogChannel: "offline",
      type: null,
      expectedCode: QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE,
      actualCode: catchCode(() => {
        snapQuote(
          [
            {
              id: "synthetic-offline-null-type",
              name: "synthetic null type",
              location: "",
              type: null,
              catalogChannel: "offline",
              price: 10_000_000,
            },
          ],
          { startDate: CORE_START, endDate: CORE_END },
        );
      }),
    },
    {
      id: "null_channel_uses_fixed",
      note: "catalogChannel null → FixedPeriodPricing (legacy와 동일)",
      catalogChannel: null,
      expectedCode: "NO_THROW",
      actualCode: catchCode(() => {
        snapQuote(
          [{ ...anchor, catalogChannel: null }],
          { startDate: CORE_START, endDate: CORE_END },
        );
      }),
    },
  ];

  const payload = {
    version: 1,
    label: "pr2-golden-baseline-current-calculateQuote",
    at: new Date().toISOString(),
    engine: "lib/quote-calculator.calculateQuote",
    issuedAtPinned: ISSUED_AT.toISOString(),
    mediaFixtures: "lib/pricing/__tests__/golden/pr2-quote-snapshot.json",
    classifiedSampleIds: [...CLASSIFIED],
    vsExistingGoldenTotalWonMismatches: vsExisting,
    inputAxes: {
      resolvePricingStrategy: {
        catalogChannel: ["null", "undefined", "offline", "online", "other"],
        branch: {
          online: "BudgetPricing",
          "null|undefined|offline|other": "FixedPeriodPricing",
        },
      },
      calculateQuote: [
        "media[] (id,name,location,type,catalogChannel,price,pricePeriod,priceOptions,partialPeriodRates,dailyFootfall,impressions,lat/lng,onlineSpec)",
        "startDate / endDate → inclusiveCampaignDays → periodDays / monthFactor",
        "discountRate",
        "issuedAt (totals 무관)",
        "periodKey",
        "mediaPriceOptionIndex",
        "mediaSelections",
      ],
      pricingStrategyContext: [
        "startDate",
        "endDate",
        "periodDays",
        "monthFactor",
        "discountRate",
        "periodKey",
        "mediaPriceOptionIndex",
        "mediaSelections",
        "useOptionPricing (= periodKey is 1/3/5/7/15/30days AND mediaPriceOptionIndex defined)",
        "campaignPeriod",
        "campaignDays",
        "selectionMap",
        "poMap",
      ],
      fixedPeriodPricing: [
        "assertQuoteCalculatorDisplayType(type)",
        "useOptionPricing + campaignPeriod → buildQuoteWizardLineContext",
        "package quantity path",
        "mobile multi-unit path",
        "default catalogPriceFieldToWon(price) * monthFactor",
      ],
      budgetPricing: [
        "media.id",
        "media.catalogChannel (must be online to reach stub)",
        "media.onlineSpec.platform (메시지 hint만)",
        "ctx 미사용 — 항상 BUDGET_PRICING_NOT_IMPLEMENTED throw",
      ],
    },
    core: {
      sampleCount: 34,
      calcRows: coreExpected.length,
      startDate: "2026-03-01",
      endDate: "2026-03-14",
      scenarios: CORE_SCENARIOS,
      expected: coreExpected,
    },
    boundary: {
      syntheticMedia: [partialAnchor, zeroPrice],
      rows: boundary,
    },
    throws,
  };

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        out: "reports/pr2-golden-baseline.json",
        coreRows: coreExpected.length,
        boundaryRows: boundary.length,
        throws: throws.length,
        vsExistingMismatches: vsExisting.length,
      },
      null,
      2,
    ),
  );
}

main();
