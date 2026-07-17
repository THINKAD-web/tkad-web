import assert from "node:assert/strict";
import { test } from "node:test";
import { MediaBookingStatus } from "@prisma/client";
import {
  BookingHoldConflictError,
  QuoteHoldDatesRequiredError,
  createHoldsForQuote,
  promoteHoldsToConfirmed,
  releaseHoldsForQuote,
  resolveQuoteHoldRange,
  type QuoteHoldDb,
} from "./ooh-quote-booking-hold.ts";

test("resolveQuoteHoldRange: uses endDate when present", () => {
  const range = resolveQuoteHoldRange({
    id: "q1",
    clientName: "A",
    mediaIds: ["m1"],
    startDate: new Date("2026-08-01T00:00:00"),
    endDate: new Date("2026-08-10T00:00:00"),
    periodKey: "30days",
    period: "30일",
  });
  assert.equal(range.startsAt.getDate(), 1);
  assert.equal(range.endsAt.getDate(), 10);
});

test("resolveQuoteHoldRange: estimates end from periodKey", () => {
  const range = resolveQuoteHoldRange({
    id: "q1",
    clientName: "A",
    mediaIds: ["m1"],
    startDate: new Date("2026-08-01T00:00:00"),
    endDate: null,
    periodKey: "7days",
    period: "7일",
  });
  assert.equal(range.endsAt.getDate(), 8);
});

test("resolveQuoteHoldRange: missing startDate throws", () => {
  assert.throws(
    () =>
      resolveQuoteHoldRange({
        id: "q1",
        clientName: "A",
        mediaIds: ["m1"],
        startDate: null,
        endDate: null,
        periodKey: "30days",
        period: "30일",
      }),
    QuoteHoldDatesRequiredError,
  );
});

function mockDb(opts: {
  existingCount?: number;
  conflictsByMedia?: Record<
    string,
    Array<{
      id: string;
      mediaId: string;
      title: string;
      startsAt: Date;
      endsAt: Date;
      status: string;
    }>
  >;
  medias?: Array<{ id: string; name: string }>;
  activeHolds?: Array<{ id: string; notes?: string | null }>;
}): { db: QuoteHoldDb; created: unknown[]; updated: unknown[] } {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const conflictsByMedia = opts.conflictsByMedia ?? {};

  const db = {
    mediaBooking: {
      count: async () => opts.existingCount ?? 0,
      findMany: async (args: { where: { mediaId?: string; oohQuoteId?: string } }) => {
        if (args.where.oohQuoteId && !args.where.mediaId) {
          return opts.activeHolds ?? [];
        }
        return conflictsByMedia[args.where.mediaId ?? ""] ?? [];
      },
      createMany: async ({ data }: { data: unknown[] }) => {
        created.push(...data);
        return { count: data.length };
      },
      updateMany: async ({ data }: { data: unknown }) => {
        updated.push(data);
        return { count: 1 };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: unknown;
      }) => {
        updated.push({ id: where.id, data });
        return { id: where.id };
      },
    },
    media: {
      findMany: async () => opts.medias ?? [{ id: "m1", name: "강남" }],
    },
  } as unknown as QuoteHoldDb;

  return { db, created, updated };
}

test("createHoldsForQuote: creates tentative rows", async () => {
  const { db, created } = mockDb({
    medias: [{ id: "m1", name: "강남전광판" }],
  });
  const result = await createHoldsForQuote(db, {
    id: "q1",
    clientName: "홍길동",
    mediaIds: ["m1"],
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-31"),
    periodKey: "30days",
    period: "30일",
  });
  assert.equal(result.created, 1);
  assert.equal(result.skipped, false);
  assert.equal(
    (created[0] as { status: string }).status,
    MediaBookingStatus.tentative,
  );
  assert.equal((created[0] as { oohQuoteId: string }).oohQuoteId, "q1");
});

test("createHoldsForQuote: conflict without force throws BOOKING_CONFLICT", async () => {
  const { db } = mockDb({
    conflictsByMedia: {
      m1: [
        {
          id: "b1",
          mediaId: "m1",
          title: "기존",
          startsAt: new Date("2026-08-01"),
          endsAt: new Date("2026-08-15"),
          status: "confirmed",
        },
      ],
    },
  });
  await assert.rejects(
    () =>
      createHoldsForQuote(db, {
        id: "q2",
        clientName: "B",
        mediaIds: ["m1"],
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-31"),
        periodKey: "30days",
        period: "30일",
      }),
    (err: unknown) =>
      err instanceof BookingHoldConflictError && err.code === "BOOKING_CONFLICT",
  );
});

test("createHoldsForQuote: force=true creates despite conflict", async () => {
  const { db, created } = mockDb({
    conflictsByMedia: {
      m1: [
        {
          id: "b1",
          mediaId: "m1",
          title: "기존",
          startsAt: new Date("2026-08-01"),
          endsAt: new Date("2026-08-15"),
          status: "confirmed",
        },
      ],
    },
  });
  const result = await createHoldsForQuote(
    db,
    {
      id: "q2",
      clientName: "B",
      mediaIds: ["m1"],
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      periodKey: "30days",
      period: "30일",
    },
    { force: true },
  );
  assert.equal(result.created, 1);
  assert.equal(created.length, 1);
});

test("createHoldsForQuote: idempotent when holds already exist", async () => {
  const { db, created } = mockDb({ existingCount: 2 });
  const result = await createHoldsForQuote(db, {
    id: "q1",
    clientName: "A",
    mediaIds: ["m1"],
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-31"),
    periodKey: "30days",
    period: "30일",
  });
  assert.equal(result.skipped, true);
  assert.equal(result.created, 0);
  assert.equal(created.length, 0);
});

test("promoteHoldsToConfirmed: updates tentative → confirmed", async () => {
  const { db, updated } = mockDb({});
  const result = await promoteHoldsToConfirmed(db, "q1");
  assert.equal(result.updated, 1);
  assert.deepEqual(updated[0], { status: MediaBookingStatus.confirmed });
});

test("releaseHoldsForQuote: cancels active holds", async () => {
  const { db, updated } = mockDb({
    activeHolds: [
      { id: "b1", notes: "n1" },
      { id: "b2", notes: null },
    ],
  });
  const result = await releaseHoldsForQuote(db, "q1", "cancel");
  assert.equal(result.updated, 2);
  assert.equal(updated.length, 2);
  assert.equal(
    (updated[0] as { data: { status: string } }).data.status,
    MediaBookingStatus.cancelled,
  );
});
