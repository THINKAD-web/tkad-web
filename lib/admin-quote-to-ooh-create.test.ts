import assert from "node:assert/strict";
import test from "node:test";
import { createOoHQuoteFromAdminQuote } from "@/lib/admin-quote-to-ooh-create";
import type { Quote, QuoteItem } from "@prisma/client";
import { encodeAdminQuoteItemSpec } from "@/lib/admin-quote-line-spec";

function minimalQuote(): Quote & { items: QuoteItem[] } {
  return {
    id: "admin-q-1",
    quoteNumber: "Q-001",
    status: "sent",
    clientName: "Acme · Kim",
    clientEmail: "kim@acme.com",
    clientPhone: "010",
    validUntil: new Date("2026-08-01T12:00:00.000Z"),
    subtotal: 1_000_000,
    discount: 0,
    tax: 100_000,
    total: 1_100_000,
    isKo: true,
    sentAt: null,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    items: [
      {
        id: "i1",
        quoteId: "admin-q-1",
        mediaId: "m1",
        mediaName: "매체A",
        spec: encodeAdminQuoteItemSpec("—", { priceOptionIndex: 0 }),
        period: "2026-07-01 ~ 2026-07-30",
        unitPrice: 1_000_000,
        quantity: 1,
        amount: 1_000_000,
      },
    ],
  };
}

test("createOoHQuoteFromAdminQuote is idempotent", async () => {
  let createCount = 0;
  const quote = minimalQuote();
  const db = {
    ooHQuote: {
      findUnique: async () => ({ id: "ooh-existing" }),
      create: async () => {
        createCount += 1;
        return { id: "ooh-new" };
      },
    },
    quote: {
      findUnique: async () => quote,
      findUniqueOrThrow: async () => quote,
    },
  };

  const r1 = await createOoHQuoteFromAdminQuote(db, "admin-q-1");
  const r2 = await createOoHQuoteFromAdminQuote(db, "admin-q-1");

  assert.equal(r1.oohQuoteId, "ooh-existing");
  assert.equal(r2.oohQuoteId, "ooh-existing");
  assert.equal(r1.created, false);
  assert.equal(r2.created, false);
  assert.equal(createCount, 0);
});

test("createOoHQuoteFromAdminQuote creates when absent", async () => {
  let createCount = 0;
  const quote = minimalQuote();
  const db = {
    ooHQuote: {
      findUnique: async ({ where }: { where: { sourceAdminQuoteId?: string } }) =>
        where.sourceAdminQuoteId ? null : null,
      create: async () => {
        createCount += 1;
        return { id: "ooh-new" };
      },
    },
    quote: {
      findUnique: async () => quote,
      findUniqueOrThrow: async () => quote,
    },
  };

  const r = await createOoHQuoteFromAdminQuote(db, "admin-q-1");
  assert.equal(r.oohQuoteId, "ooh-new");
  assert.equal(r.created, true);
  assert.equal(createCount, 1);
  assert.equal(r.bridge.totalAmountManwon, 110);
});
