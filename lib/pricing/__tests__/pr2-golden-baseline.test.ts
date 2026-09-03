import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateQuote } from "@/lib/quote-calculator";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";
import { QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE } from "@/lib/pricing/fixed-period-pricing";
import type { QuoteCalculatorMedia } from "@/lib/pricing/strategy-types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const baselinePath = join(root, "reports/pr2-golden-baseline.json");
const mediaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden/pr2-quote-snapshot.json",
);

const ISSUED_AT = new Date("2026-03-01T00:00:00.000Z");

type Snap = {
  totalWon: number;
  supplyWon: number;
  vatWon: number;
  periodDays: number;
  lineSupplyWon: number | null;
  unitPriceWon: number | null;
  linePeriodDays: number | null;
};

type Baseline = {
  core: {
    sampleCount: number;
    calcRows: number;
    startDate: string;
    endDate: string;
    scenarios: Array<{ name: string; periodKey?: string }>;
    expected: Array<
      Snap & {
        mediaId: string;
        scenario: string;
        periodKey: string | null;
      }
    >;
  };
  boundary: {
    syntheticMedia: QuoteCalculatorMedia[];
    rows: Array<
      Snap & {
        id: string;
        kind: string;
        periodKey?: string | null;
        calendarDays?: number;
        mediaId: string;
      }
    >;
  };
  throws: Array<{
    id: string;
    expectedCode: string;
    actualCode: string;
    budgetWon?: number;
    expectedSnap?: Snap;
  }>;
  vsExistingGoldenTotalWonMismatches: unknown[];
};

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(baselinePath, "utf8")) as Baseline;
}

function snapQuote(
  media: QuoteCalculatorMedia[],
  opts: {
    startDate: Date;
    endDate: Date;
    periodKey?: string;
    mediaPriceOptionIndex?: Record<string, number>;
    mediaSelections?: QuoteMediaSelectionSnapshot[];
  },
): Snap {
  const q = calculateQuote({
    media,
    startDate: opts.startDate,
    endDate: opts.endDate,
    discountRate: 0,
    issuedAt: ISSUED_AT,
    periodKey: opts.periodKey,
    mediaPriceOptionIndex: opts.mediaPriceOptionIndex,
    mediaSelections: opts.mediaSelections,
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

function assertSnapEqual(actual: Snap, expected: Snap, label: string) {
  assert.deepEqual(
    actual,
    {
      totalWon: expected.totalWon,
      supplyWon: expected.supplyWon,
      vatWon: expected.vatWon,
      periodDays: expected.periodDays,
      lineSupplyWon: expected.lineSupplyWon,
      unitPriceWon: expected.unitPriceWon,
      linePeriodDays: expected.linePeriodDays,
    },
    label,
  );
}

test("PR2 Phase1 baseline — 34×3=102 core rows match current calculateQuote", () => {
  const baseline = loadBaseline();
  const fixtures = JSON.parse(readFileSync(mediaPath, "utf8")) as {
    media: QuoteCalculatorMedia[];
  };
  const mediaById = new Map(fixtures.media.map((m) => [m.id, m]));

  assert.equal(baseline.core.sampleCount, 34);
  assert.equal(baseline.core.calcRows, 102);
  assert.equal(baseline.core.expected.length, 102);
  assert.deepEqual(baseline.vsExistingGoldenTotalWonMismatches, []);

  const startDate = new Date(`${baseline.core.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${baseline.core.endDate}T00:00:00.000Z`);

  for (const exp of baseline.core.expected) {
    const media = mediaById.get(exp.mediaId);
    assert.ok(media, exp.mediaId);
    const scenario = baseline.core.scenarios.find((s) => s.name === exp.scenario);
    assert.ok(scenario, exp.scenario);
    const actual = snapQuote([media], {
      startDate,
      endDate,
      periodKey: scenario.periodKey,
      mediaPriceOptionIndex: {},
    });
    assertSnapEqual(actual, exp, `${exp.mediaId}|${exp.scenario}`);
  }
});

test("PR2 Phase1 baseline — tier / interpolation / 0원 boundary rows", () => {
  const baseline = loadBaseline();
  const mediaById = new Map(
    baseline.boundary.syntheticMedia.map((m) => [m.id, m]),
  );
  assert.ok(baseline.boundary.rows.length >= 12);

  for (const exp of baseline.boundary.rows) {
    const media = mediaById.get(exp.mediaId);
    assert.ok(media, exp.mediaId);
    const startDate = new Date("2026-03-01T00:00:00.000Z");
    const endDate =
      exp.kind === "calendar_proration" && exp.calendarDays
        ? new Date(
            Date.UTC(2026, 2, exp.calendarDays),
          )
        : new Date("2026-03-14T00:00:00.000Z");
    const actual = snapQuote([media], {
      startDate,
      endDate,
      periodKey: exp.periodKey ?? undefined,
      mediaPriceOptionIndex:
        exp.kind === "wizard_option_pricing" ? {} : undefined,
    });
    assertSnapEqual(actual, exp, exp.id);
  }
});

test("online budget: calculable with onlineSpec + lineTotalWon (PR5-a BudgetPricing)", () => {
  const baseline = loadBaseline();
  const row = baseline.throws.find((t) => t.id === "online_budget_stub");
  assert.ok(row);
  assert.equal(row.expectedCode, "NO_THROW");
  assert.equal(row.actualCode, "NO_THROW");

  const budgetWon = row.budgetWon ?? 1_000_000;
  const media: QuoteCalculatorMedia = {
    id: "synthetic-online",
    name: "synthetic online",
    location: "",
    type: null,
    catalogChannel: "online",
    price: 0,
    onlineSpec: {
      platform: "test",
      minBudget: 500_000,
      cpcMin: 100,
      cpcMax: 300,
      cpmMin: null,
      cpmMax: null,
    },
  };

  const actual = snapQuote([media], {
    startDate: ISSUED_AT,
    endDate: new Date("2026-03-14T00:00:00.000Z"),
    mediaPriceOptionIndex: {},
    mediaSelections: [
      {
        mediaId: media.id,
        priceOptionIndex: 0,
        optionLabel: null,
        optionPriceWon: budgetWon,
        lineTotalWon: budgetWon,
      },
    ],
  });

  assertSnapEqual(
    actual,
    {
      totalWon: row.expectedSnap!.totalWon,
      supplyWon: row.expectedSnap!.supplyWon,
      vatWon: row.expectedSnap!.vatWon,
      periodDays: row.expectedSnap!.periodDays,
      lineSupplyWon: row.expectedSnap!.lineSupplyWon,
      unitPriceWon: row.expectedSnap!.unitPriceWon,
      linePeriodDays: row.expectedSnap!.linePeriodDays,
    },
    "online_budget_stub",
  );
});

test("throw: offline + type null → QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE", () => {
  const baseline = loadBaseline();
  const row = baseline.throws.find((t) => t.id === "offline_null_type");
  assert.ok(row);
  assert.equal(row.expectedCode, QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE);
  assert.equal(row.actualCode, QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE);

  assert.throws(
    () =>
      calculateQuote({
        media: [
          {
            id: "synthetic-offline-null-type",
            name: "synthetic null type",
            location: "",
            type: null,
            catalogChannel: "offline",
            price: 10_000_000,
          },
        ],
        startDate: ISSUED_AT,
        endDate: new Date("2026-03-14T00:00:00.000Z"),
        issuedAt: ISSUED_AT,
      }),
    (e: unknown) =>
      e instanceof Error &&
      e.message.startsWith(QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE),
  );
});

test("no throw: catalogChannel null → FixedPeriodPricing", () => {
  const baseline = loadBaseline();
  const row = baseline.throws.find((t) => t.id === "null_channel_uses_fixed");
  assert.ok(row);
  assert.equal(row.expectedCode, "NO_THROW");
  assert.equal(row.actualCode, "NO_THROW");

  const fixtures = JSON.parse(readFileSync(mediaPath, "utf8")) as {
    media: QuoteCalculatorMedia[];
  };
  const anchor = fixtures.media.find(
    (m) => m.id === "cmox1l6tx000204kysagmp1v8",
  );
  assert.ok(anchor);

  assert.doesNotThrow(() =>
    calculateQuote({
      media: [{ ...anchor, catalogChannel: null }],
      startDate: ISSUED_AT,
      endDate: new Date("2026-03-14T00:00:00.000Z"),
      issuedAt: ISSUED_AT,
    }),
  );
});
