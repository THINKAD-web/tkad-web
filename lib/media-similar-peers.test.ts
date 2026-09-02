import assert from "node:assert/strict";
import test from "node:test";
import {
  pickSimilarMediaPeerPool,
  SIMILAR_MEDIA_PEERS_DEFAULT_LIMIT,
  SIMILAR_MEDIA_PEERS_REGION_MIN,
  toSimilarMediaPeerItem,
} from "@/lib/media-similar-peers";
import type { MediaItem } from "@/lib/media-data";

function peer(partial: {
  id: string;
  region: string;
  popularityScore?: number;
}): { id: string; region: string; popularityScore: number } {
  return {
    id: partial.id,
    region: partial.region,
    popularityScore: partial.popularityScore ?? 0,
  };
}

test("same-region pool is used when count >= REGION_MIN (no national relax)", () => {
  const seoul = Array.from({ length: 40 }, (_, i) =>
    peer({ id: `s${i}`, region: "seoul", popularityScore: 100 - i }),
  );
  const busan = Array.from({ length: 10 }, (_, i) =>
    peer({ id: `b${i}`, region: "busan", popularityScore: 200 }),
  );
  const picked = pickSimilarMediaPeerPool(
    [...seoul, ...busan],
    { id: "s0", region: "seoul" },
    64,
  );
  assert.equal(picked.length, 39);
  assert.ok(picked.every((m) => m.region === "seoul"));
  assert.equal(picked[0]?.id, "s1");
});

test("seoul|dooh-scale region (389 peers) stays region-only and capped", () => {
  const seoul = Array.from({ length: 389 }, (_, i) =>
    peer({ id: `s${i}`, region: "seoul", popularityScore: 389 - i }),
  );
  const other = Array.from({ length: 50 }, (_, i) =>
    peer({ id: `n${i}`, region: "national", popularityScore: 999 }),
  );
  const picked = pickSimilarMediaPeerPool(
    [...seoul, ...other],
    { id: "s0", region: "seoul" },
    SIMILAR_MEDIA_PEERS_DEFAULT_LIMIT,
  );
  assert.equal(picked.length, 64);
  assert.ok(picked.every((m) => m.region === "seoul" && m.id !== "s0"));
  assert.equal(picked[0]?.id, "s1");
  assert.ok(!picked.some((m) => m.id.startsWith("n")));
});

test("thin region keeps regional rows and fills from other regions", () => {
  const jeju = Array.from({ length: 5 }, (_, i) =>
    peer({ id: `j${i}`, region: "jeju", popularityScore: i }),
  );
  const seoul = Array.from({ length: 20 }, (_, i) =>
    peer({ id: `s${i}`, region: "seoul", popularityScore: 50 + i }),
  );
  assert.ok(jeju.length - 1 < SIMILAR_MEDIA_PEERS_REGION_MIN);
  const picked = pickSimilarMediaPeerPool(
    [...jeju, ...seoul],
    { id: "j0", region: "jeju" },
    64,
  );
  assert.equal(picked.length, 24);
  assert.equal(picked[0]?.region, "jeju");
  assert.equal(picked.filter((m) => m.region === "jeju").length, 4);
  assert.equal(picked.filter((m) => m.region === "seoul").length, 20);
});

test("toSimilarMediaPeerItem drops detail blobs", () => {
  const slim = toSimilarMediaPeerItem({
    id: "m1",
    name: "A",
    nameEn: "A",
    location: "서울 강남",
    locationEn: "Gangnam",
    region: "seoul",
    type: "dooh",
    price: 1,
    lat: 37,
    lng: 127,
    dailyFootTraffic: 10,
    sampleImages: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    description: "long ".repeat(80),
    trafficPattern: { hourly: Array(24).fill(1) },
  } as MediaItem);
  assert.equal(slim.location, "");
  assert.equal(slim.sampleImages?.length, 1);
  assert.equal(slim.description, undefined);
  assert.equal(slim.trafficPattern, undefined);
});
