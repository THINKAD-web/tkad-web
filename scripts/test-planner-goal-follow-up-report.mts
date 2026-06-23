import assert from "node:assert/strict";
import { buildGoalFollowUpReportLines } from "../lib/planner/goal-follow-up.ts";

assert.deepEqual(
  buildGoalFollowUpReportLines(
    "brand",
    { goalReferenceNote: "글로벌 여행객/외국인 타겟" },
    true,
  ),
  ["목표 (참고) · 글로벌 여행객/외국인 타겟"],
);

assert.deepEqual(
  buildGoalFollowUpReportLines(
    "sales",
    {
      conversionChannel: "both",
      conversionKpi: "글로벌 여행객/외국인 타겟",
    },
    true,
  ),
  [
    "유도 방향 · 매장+온라인",
    "목표 (참고) · 글로벌 여행객/외국인 타겟",
  ],
);

assert.deepEqual(
  buildGoalFollowUpReportLines("launch", { launchFocusWeeks: 4 }, true),
  ["집중 기간 · 런칭 후 4주"],
);

console.log("planner-goal-follow-up-report: ok");
