import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { buildOnlineCategoryRows } from "@/lib/planner-report-export/online-category-breakdown";
import {
  buildOnlineCreativeDirections,
  buildOnlineOperationalNotes,
  buildOnlinePacingPlan,
  buildPlatformCreativeDirections,
} from "@/lib/planner-report-export/online-report-insights";
import { buildOnlineReportSection } from "@/lib/planner-report-export/payload-online";

const tiktok: MediaItem = {
  id: "t1",
  slug: "tiktok-spark-awareness",
  name: "틱톡 스파크",
  nameEn: "TikTok Spark",
  type: "online",
  catalogChannel: "online",
  mediaMainCategory: "sns",
  location: "",
  locationEn: "",
  region: "other",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  onlineSpec: {
    platform: "TikTok",
    cpcMin: 150,
    cpcMax: 500,
    cpmMin: 2500,
    cpmMax: 5500,
  },
};

const karrot: MediaItem = {
  id: "k1",
  slug: "karrot-local-traffic",
  name: "당근 지역",
  nameEn: "Karrot",
  type: "online",
  catalogChannel: "online",
  mediaMainCategory: "local",
  location: "",
  locationEn: "",
  region: "other",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  onlineSpec: { platform: "Karrot (당근)" },
};

const baseArgs = {
  isKo: true,
  goalTitle: "브랜드 인지도",
  budgetMan: 3000,
  periodDisplay: "1개월",
  regionsText: "서울, 부산, 대구, 광주",
  categoriesText: "혼합",
  ageText: "25~34세 여성",
  industryText: "F&B",
  generatedAt: "2026-09-05",
  months: 1,
};

test("buildOnlineCategoryRows — groups by mediaMainCategory", () => {
  const rows = buildOnlineCategoryRows(
    [tiktok, karrot],
    [
      { mediaId: "t1", budgetWon: 1_000_000 },
      { mediaId: "k1", budgetWon: 500_000 },
    ],
    true,
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.some((r) => r.label === "SNS"));
  assert.ok(rows.some((r) => r.label.includes("로컬")));
  const totalPct = rows.reduce((s, r) => s + r.budgetSharePct, 0);
  assert.ok(Math.abs(totalPct - 100) < 0.2);
});

test("buildPlatformCreativeDirections — prefers platform map over raw catalog", () => {
  const dirs = buildPlatformCreativeDirections([tiktok], true);
  assert.ok(dirs.some((d) => d.includes("9:16") || d.includes("숏폼")));
  assert.ok(!dirs.some((d) => d.includes("숏폼 콘텐츠 보유")));
});

test("buildOnlineCreativeDirections — C plan merges platform + heuristic", () => {
  const dirs = buildOnlineCreativeDirections({
    isKo: true,
    portfolio: [tiktok],
    ageText: "25~34세 여성",
    regionsText: "서울",
  });
  assert.ok(dirs.length >= 1);
  assert.ok(dirs.length <= 4);
});

test("buildOnlinePacingPlan — short vs standard flight", () => {
  assert.equal(buildOnlinePacingPlan(10, true).length, 2);
  assert.equal(buildOnlinePacingPlan(30, true).length, 4);
  assert.equal(buildOnlinePacingPlan(null, true)[0]?.sharePct, 20);
});

test("buildOnlineOperationalNotes — channel threshold >= 4", () => {
  const notes = buildOnlineOperationalNotes({
    isKo: true,
    channelCount: 4,
    budgetWon: 5_000_000,
    daySpan: 30,
    regionsText: "서울",
  });
  assert.ok(notes.some((n) => n.includes("채널 수가 많")));
});

test("buildOnlineReportSection — PR6-c enrichment fields", () => {
  const section = buildOnlineReportSection({
    ...baseArgs,
    portfolio: [tiktok, karrot],
    planCartItems: [
      { mediaId: "t1", mediaName: "t", mediaType: "online", catalogChannel: "online", region: "", price: 0, addedFrom: "search", addedAt: 1, lineTotalWon: 1_000_000 },
      { mediaId: "k1", mediaName: "k", mediaType: "online", catalogChannel: "online", region: "", price: 0, addedFrom: "search", addedAt: 2, lineTotalWon: 500_000 },
    ],
  });
  assert.equal(section.kpiCards?.length, 4);
  assert.ok(section.categoryRows?.length);
  assert.ok(section.insights?.pacingPlan.length);
  assert.ok(section.insights?.creativeDirections.length);
  assert.ok(section.insights?.operationalNotes.length);
  assert.equal(section.inquiryLineCount, 1);
});
