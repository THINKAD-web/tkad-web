import test from "node:test";
import assert from "node:assert/strict";
import type { MediaItem } from "@/lib/media-data.ts";
import {
  buildMediaProposalOverviewRows,
  formatDailyFootfallForProposal,
  formatPanelResolutionForProposal,
  formatPhysicalSizeForProposal,
} from "@/lib/media-proposal-pdf-spec.ts";

function mockMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-media",
    name: "테스트 LED",
    location: "서울",
    region: "seoul",
    type: "dooh",
    price: 5_000_000,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...overrides,
  };
}

function overviewRows(media: MediaItem, isKo = true) {
  return buildMediaProposalOverviewRows(media, {
    isKo,
    locale: isKo ? "ko-KR" : "en-US",
    categoryLabel: "digital · billboard",
    locationLine: media.location,
    priceWon: media.price,
  });
}

function findRightLabel(rows: ReturnType<typeof overviewRows>, label: string) {
  return rows.right.find(([, l]) => l === label);
}

test("T1 — panel resolution label and value, no 송출/노출", () => {
  const media = mockMedia({
    resolution: "2192 x 2976 pixel",
    impressions: 1_850_000,
  });
  const rows = overviewRows(media);
  const panel = findRightLabel(rows, "패널 해상도");
  assert.ok(panel);
  assert.equal(panel[2], "2192 x 2976 pixel");
  assert.equal(
    rows.right.some(([, l]) => l.includes("송출") || l.includes("노출")),
    false,
  );
  assert.equal(
    rows.left.some(([, , v]) => v.includes("2192")),
    false,
  );
});

test("T2 — daily footfall uses dailyFootTraffic not impressions/30", () => {
  const media = mockMedia({
    dailyFootTraffic: 62_000,
    impressions: 1_850_000,
  });
  const footfall = findRightLabel(overviewRows(media), "일일 유동인구(추정)");
  assert.ok(footfall);
  assert.equal(footfall[2], "62,000명");
  assert.notEqual(footfall[2], "61,667명");
});

test("T3 — physical size excludes resolution", () => {
  const media = mockMedia({
    size: "12m × 8m",
    resolution: "2192 x 2976",
  });
  const sizeRow = overviewRows(media).left.find(([, l]) => l === "규격");
  assert.ok(sizeRow);
  assert.equal(sizeRow[2], "12m × 8m");
  assert.equal(formatPhysicalSizeForProposal(media), "12m × 8m");
});

test("T4 — empty resolution shows em dash, not 상시 송출", () => {
  const media = mockMedia({ resolution: "" });
  assert.equal(formatPanelResolutionForProposal(media), "—");
  const panel = findRightLabel(overviewRows(media), "패널 해상도");
  assert.ok(panel);
  assert.equal(panel[2], "—");
  assert.notEqual(panel[2], "상시 송출");
});

test("T5 — dailyFootfall fallback when dailyFootTraffic is zero", () => {
  const media = mockMedia({ dailyFootTraffic: 0, dailyFootfall: 45_000 });
  assert.equal(formatDailyFootfallForProposal(media, "ko-KR", true), "45,000명");
});

test("T6 — no footfall data shows em dash", () => {
  const media = mockMedia({ dailyFootTraffic: 0 });
  assert.equal(formatDailyFootfallForProposal(media, "ko-KR", true), "—");
  const footfall = findRightLabel(overviewRows(media), "일일 유동인구(추정)");
  assert.equal(footfall?.[2], "—");
});

test("T7 — English labels and locale formatting", () => {
  const media = mockMedia({
    resolution: "1920 x 1080",
    dailyFootTraffic: 1200,
    size: "10m x 6m",
  });
  const rows = overviewRows(media, false);
  assert.ok(findRightLabel(rows, "Panel resolution"));
  assert.ok(findRightLabel(rows, "Daily footfall (est.)"));
  assert.equal(
    formatDailyFootfallForProposal(media, "en-US", false),
    "1,200",
  );
});
