import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  MEDIA_CSV_HEADERS,
  parseMediaCsv,
  type MediaCsvRow,
} from "@/lib/admin-media-csv";
import { shouldAutoRecomputeMediaMetrics } from "@/lib/media/engine/auto-recompute.ts";

function sampleCsvRow(overrides: Partial<MediaCsvRow> = {}): MediaCsvRow {
  return {
    rowIndex: 2,
    name: "테스트 CSV 매체",
    type: "digital",
    location: "서울 강남구 강남대로 396",
    price: 3_500_000,
    spec: "12x4m",
    width: "12",
    height: "4",
    exposure: 150_000,
    description: "통합 테스트",
    region: "seoul",
    ...overrides,
  };
}

function csvTextFromRow(row: MediaCsvRow): string {
  return [
    MEDIA_CSV_HEADERS.join(","),
    [
      row.name,
      row.type,
      row.location,
      String(row.price),
      row.spec,
      row.exposure == null ? "" : String(row.exposure),
      row.description,
    ].join(","),
  ].join("\n");
}

type StoredMedia = {
  id: string;
  name: string;
  dailyFootfall: number | null;
  impressions: number | null;
};

function makeDb(initial?: Partial<StoredMedia>) {
  const store = new Map<string, StoredMedia>();
  let seq = 0;

  const db = {
    media: {
      create: async ({
        data,
      }: {
        data: {
          name: string;
          dailyFootfall: number | null;
          impressions?: number | null;
        };
      }) => {
        seq += 1;
        const id = initial?.id ?? `csv-media-${seq}`;
        const rec: StoredMedia = {
          id,
          name: data.name,
          dailyFootfall: data.dailyFootfall,
          impressions:
            data.impressions ?? initial?.impressions ?? null,
        };
        store.set(id, rec);
        return rec;
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { dailyFootfall?: true; impressions?: true };
      }) => {
        const rec = store.get(where.id);
        if (!rec) return null;
        if (select) {
          return {
            dailyFootfall: rec.dailyFootfall,
            impressions: rec.impressions,
          };
        }
        return rec;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { impressions?: number | null };
      }) => {
        const rec = store.get(where.id);
        if (!rec) throw new Error("not found");
        if (data.impressions !== undefined) {
          rec.impressions = data.impressions;
        }
        store.set(where.id, rec);
        return rec;
      },
    },
  };

  return { db: db as unknown as PrismaClient, store };
}

let recomputeCalls = 0;
let throwOnRecompute = false;

mock.module("@/lib/media/engine/auto-recompute.ts", {
  namedExports: {
    shouldAutoRecomputeMediaMetrics,
    maybeAutoRecomputeMediaMetrics: async (
      db: ReturnType<typeof makeDb>["db"],
      mediaId: string,
    ) => {
      const media = await db.media.findUnique({
        where: { id: mediaId },
        select: { dailyFootfall: true, impressions: true },
      });
      if (!media || !shouldAutoRecomputeMediaMetrics(media)) return;

      try {
        recomputeCalls += 1;
        if (throwOnRecompute) {
          throw new Error("engine exploded");
        }
        await db.media.update({
          where: { id: mediaId },
          data: { impressions: 4_500_000 },
        });
      } catch {
        // mirrors production hook: save path must not fail
      }
    },
  },
});

const { createMediaFromCsvRow } = await import("./route.ts");

test("import-csv: footfall row auto-fills impressions after create", async () => {
  recomputeCalls = 0;
  throwOnRecompute = false;
  const { db, store } = makeDb();

  await createMediaFromCsvRow(db, sampleCsvRow({ exposure: 150_000 }));

  assert.equal(recomputeCalls, 1);
  assert.equal([...store.values()][0]?.impressions, 4_500_000);
});

test("import-csv: existing impressions are not recomputed (hook guard)", async () => {
  recomputeCalls = 0;
  throwOnRecompute = false;
  const { db, store } = makeDb({
    id: "csv-media-existing-impressions",
    impressions: 6_450_000,
  });

  await createMediaFromCsvRow(db, sampleCsvRow());

  assert.equal(recomputeCalls, 0);
  assert.equal(store.get("csv-media-existing-impressions")?.impressions, 6_450_000);
});

test("import-csv: hook internal failure does not abort row import", async () => {
  recomputeCalls = 0;
  throwOnRecompute = true;
  const { db } = makeDb();

  const id = await createMediaFromCsvRow(db, sampleCsvRow({ exposure: 80_000 }));

  assert.ok(id.startsWith("csv-media-"));
  assert.equal(recomputeCalls, 1);
});

test("import-csv: row loop continues when one createMediaFromCsvRow fails", async () => {
  recomputeCalls = 0;
  throwOnRecompute = false;
  const { db } = makeDb();
  const outcomes: Array<"created" | "failed"> = [];

  for (const row of [
    sampleCsvRow({ name: "실패행", type: "invalid_type" }),
    sampleCsvRow({ name: "성공행", rowIndex: 3 }),
  ]) {
    try {
      await createMediaFromCsvRow(db, row);
      outcomes.push("created");
    } catch {
      outcomes.push("failed");
    }
  }

  assert.deepEqual(outcomes, ["failed", "created"]);
  assert.equal(recomputeCalls, 1);
});

test("import-csv: parsed template row satisfies auto-recompute precondition", () => {
  const parsed = parseMediaCsv(
    csvTextFromRow(sampleCsvRow({ exposure: 150_000 })),
  );
  const row = parsed.rows[0]!;
  assert.ok(row.exposure != null && row.exposure > 0);
  assert.equal(
    shouldAutoRecomputeMediaMetrics({
      dailyFootfall: row.exposure,
      impressions: null,
    }),
    true,
  );
});
