import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import {
  buildPlannerPortfolioScored,
  enrichPlannerPortfolioForExport,
} from "@/lib/planner/planner-portfolio-rationale";

function media(partial: Partial<MediaItem> & Pick<MediaItem, "id" | "name">): MediaItem {
  return {
    nameEn: partial.name,
    location: "",
    locationEn: "",
    region: "busan",
    type: "mobile",
    price: 300,
    ...partial,
  } as MediaItem;
}

const ctx: RecommendationContext = {
  goal: "event",
  regions: ["busan"],
  busanZones: ["centum"],
  categories: ["mobile"],
  ageKeys: [],
  industryKey: "indEnt",
  budgetMan: 500,
  months: 1,
  goalFollowUp: { eventDurationDays: 11 },
};

test("enrichPlannerPortfolioForExport injects condition-linked recommendReason", () => {
  const portfolio = [
    media({
      id: "m1",
      name: "부산 택시 래핑",
      location: "해운대·센텀권",
      type: "mobile",
      mediaMainCategory: "mobile",
    }),
  ];
  const enriched = enrichPlannerPortfolioForExport(portfolio, ctx, "ko");
  assert.ok(enriched[0]!.recommendReason?.includes("센텀") || enriched[0]!.recommendReason?.includes("부산"));
  assert.ok(enriched[0]!.rationaleLines?.length);
});

test("enriched portfolio recommendReason is non-empty for export wiring", () => {
  const enriched = enrichPlannerPortfolioForExport(
    [
      media({
        id: "m1",
        name: "부산 택시 래핑",
        location: "해운대·센텀권",
        type: "mobile",
        mediaMainCategory: "mobile",
        price: 400,
      }),
    ],
    ctx,
    "ko",
  );
  assert.ok(enriched[0]!.recommendReason?.trim());
  assert.ok((enriched[0]!.rationaleLines?.length ?? 0) >= 1);
});

test("buildPlannerPortfolioScored returns rationaleLines per media", () => {
  const scored = buildPlannerPortfolioScored(
    [
      media({
        id: "m2",
        name: "강남 택시",
        location: "강남·역삼",
        type: "mobile",
      }),
    ],
    {
      ...ctx,
      regions: ["gangnam"],
      seoulZones: ["gangnam"],
      busanZones: undefined,
      categories: ["mobile"],
    },
    "ko",
  );
  assert.ok(scored[0]!.rationaleLines.length >= 1);
});
