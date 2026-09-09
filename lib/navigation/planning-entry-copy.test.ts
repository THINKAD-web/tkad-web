import assert from "node:assert/strict";
import test from "node:test";
import { PLANNING_TABS } from "@/lib/navigation/sub-page-tabs";
import { PUBLIC_NAV_GROUPS } from "@/lib/navigation/public-nav-data";
import { isPublicNavItemActive } from "@/lib/navigation/public-nav-active";

test("PLANNING_TABS splits browse vs proposal vs packages", () => {
  assert.deepEqual(
    PLANNING_TABS.map((t) => [t.label, t.href]),
    [
      ["AI 플래너", "/recommend"],
      ["상세 플래너", "/planner"],
      ["패키지", "/media/packages"],
    ],
  );
  const browse = PLANNING_TABS[0];
  const proposal = PLANNING_TABS[1];
  assert.ok(browse.match?.("/recommend"));
  assert.ok(!browse.match?.("/planner"));
  assert.ok(proposal.match?.("/planner"));
  assert.ok(proposal.match?.("/planner/integrated"));
  assert.ok(!proposal.match?.("/recommend"));
});

test("planning group lists browse then create-proposal", () => {
  const planning = PUBLIC_NAV_GROUPS.find((g) => g.id === "planning");
  assert.ok(planning);
  assert.deepEqual(
    planning.items.map((i) => [i.id, i.href]),
    [
      ["ai-recommend", "/recommend"],
      ["media-planner", "/planner"],
    ],
  );
});

test("public nav active state does not collapse recommend into planner", () => {
  assert.equal(isPublicNavItemActive("/recommend", "ai-recommend"), true);
  assert.equal(isPublicNavItemActive("/recommend", "media-planner"), false);
  assert.equal(isPublicNavItemActive("/planner", "media-planner"), true);
  assert.equal(isPublicNavItemActive("/planner", "ai-recommend"), false);
});
