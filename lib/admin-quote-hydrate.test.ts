import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeAdminQuoteItemSpec,
  encodeAdminQuoteItemSpec,
} from "@/lib/admin-quote-line-spec";
import { splitQuoteItemsForForm } from "@/lib/admin-quote-hydrate";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import type { QuoteApi } from "@/lib/admin-sales-quote";

const busMedia = {
  id: "bus-seoul",
  name: "서울시내버스",
  nameEn: "Seoul Bus",
  location: "서울",
  region: "서울",
  type: "버스",
  price: 1200000,
  priceOptions: [
    { label: "SSA", price: 1500000, period: "month" },
    { label: "A", price: 1200000, period: "month" },
  ],
  image: null,
  latitude: null,
  longitude: null,
  dailyFootfall: null,
  visibilityScore: 0,
  width: null,
  height: null,
  resolution: null,
  operatingHours: null,
  extractedImages: [],
} as AdminMediaDto;

function quoteWithItems(items: QuoteApi["items"]): QuoteApi {
  return {
    id: "q1",
    quoteNumber: "Q-001",
    clientName: "Acme · Kim",
    clientPhone: "010",
    clientEmail: null,
    validUntil: "2026-08-01",
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    status: "draft",
    isKo: true,
    sentAt: null,
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
    items,
  };
}

test("splitQuoteItemsForForm preserves duplicate media as separate catalog lines", () => {
  const quote = quoteWithItems([
    {
      id: "1",
      mediaId: "bus-seoul",
      mediaName: "서울시내버스 (SSA)",
      spec: encodeAdminQuoteItemSpec("1920×1080", {
        priceOptionIndex: 0,
        quantityLabel: "40대",
      }),
      period: "2026-07-01 ~ 2026-07-30",
      unitPrice: 1500000,
      quantity: 40,
      amount: 60_000_000,
    },
    {
      id: "2",
      mediaId: "bus-seoul",
      mediaName: "서울시내버스 (A)",
      spec: encodeAdminQuoteItemSpec("1920×1080", {
        priceOptionIndex: 1,
        quantityLabel: "20대",
      }),
      period: "2026-07-01 ~ 2026-07-30",
      unitPrice: 1200000,
      quantity: 20,
      amount: 24_000_000,
    },
  ]);

  const { lines } = splitQuoteItemsForForm(quote, [busMedia]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.kind, "catalog");
  assert.equal(lines[1]?.kind, "catalog");
  if (lines[0]?.kind === "catalog") {
    assert.equal(lines[0].mediaId, "bus-seoul");
    assert.equal(lines[0].priceOptionIndex, 0);
    assert.equal(lines[0].quantity, 40);
  }
  if (lines[1]?.kind === "catalog") {
    assert.equal(lines[1].priceOptionIndex, 1);
    assert.equal(lines[1].quantity, 20);
  }
});

test("splitQuoteItemsForForm restores priceOptionIndex from mediaName for legacy spec", () => {
  const quote = quoteWithItems([
    {
      id: "1",
      mediaId: "bus-seoul",
      mediaName: "서울시내버스 (A)",
      spec: "1920×1080",
      period: "2026-07-01 ~ 2026-07-30",
      unitPrice: 1200000,
      quantity: 20,
      amount: 24_000_000,
    },
  ]);

  const { lines } = splitQuoteItemsForForm(quote, [busMedia]);
  const line = lines[0];
  assert.equal(line?.kind, "catalog");
  if (line?.kind === "catalog") {
    assert.equal(line.priceOptionIndex, 1);
    assert.equal(line.quantity, 20);
  }
});

test("splitQuoteItemsForForm keeps custom lines in the same array", () => {
  const quote = quoteWithItems([
    {
      id: "1",
      mediaId: "custom-c1",
      mediaName: "제작비",
      spec: null,
      period: "2026-07-01 ~ 2026-07-30",
      unitPrice: 500000,
      quantity: 1,
      amount: 500000,
    },
  ]);

  const { lines } = splitQuoteItemsForForm(quote, [busMedia]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.kind, "custom");
});

test("splitQuoteItemsForForm keeps catalog kind when media missing from list", () => {
  const quote = quoteWithItems([
    {
      id: "1",
      mediaId: "missing-media-id",
      mediaName: "신림역사거리 전광판 광고 (30초 (1일 100회))",
      spec: encodeAdminQuoteItemSpec("1224×672", {
        priceOptionIndex: 1,
        quantityLabel: "30초 (1일 100회)",
      }),
      period: "2026-08-01 ~ 2026-08-30",
      unitPrice: 7000000,
      quantity: 1,
      amount: 7000000,
    },
  ]);

  const { lines } = splitQuoteItemsForForm(quote, []);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.kind, "catalog");
  if (lines[0]?.kind === "catalog") {
    assert.equal(lines[0].mediaId, "missing-media-id");
    assert.equal(lines[0].priceOptionIndex, 1);
  }
});

test("admin quote line spec codec round-trips priceOptionIndex and quantityLabel", () => {
  const encoded = encodeAdminQuoteItemSpec("1920×1080", {
    priceOptionIndex: 2,
    quantityLabel: "40대",
  });
  const decoded = decodeAdminQuoteItemSpec(encoded);
  assert.equal(decoded.displaySpec, "1920×1080");
  assert.deepEqual(decoded.meta, {
    priceOptionIndex: 2,
    quantityLabel: "40대",
  });
});
