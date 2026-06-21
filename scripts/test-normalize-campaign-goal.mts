/**
 * normalizeCampaignGoal smoke tests.
 * Usage: npx tsx scripts/test-normalize-campaign-goal.mts
 */
import assert from "node:assert/strict";
import { normalizeCampaignGoal } from "../lib/planner/normalize-campaign-goal";
import {
  plannerGoalToProposalGoal,
  proposalGoalToPlanner,
} from "../lib/proposal/prefill-from-planner";
import { plannerGoalToContactGoals } from "../lib/planner/contact-prefill";

const cases: {
  raw: string;
  funnel: string;
  tags: string[];
  displayKey: string;
}[] = [
  { raw: "brand", funnel: "awareness", tags: [], displayKey: "brand" },
  { raw: "awareness", funnel: "awareness", tags: [], displayKey: "brand" },
  { raw: "launch", funnel: "awareness", tags: ["launch"], displayKey: "launch" },
  { raw: "event", funnel: "consideration", tags: ["event"], displayKey: "event" },
  {
    raw: "consideration",
    funnel: "consideration",
    tags: [],
    displayKey: "event",
  },
  { raw: "sales", funnel: "conversion", tags: [], displayKey: "sales" },
  { raw: "conversion", funnel: "conversion", tags: [], displayKey: "sales" },
  { raw: "local", funnel: "conversion", tags: ["local"], displayKey: "local" },
];

for (const c of cases) {
  const n = normalizeCampaignGoal(c.raw);
  assert.equal(n.funnel, c.funnel, `${c.raw} funnel`);
  assert.deepEqual(n.tags, c.tags, `${c.raw} tags`);
  assert.equal(n.displayKey, c.displayKey, `${c.raw} displayKey`);
  assert.equal(n.legacyKey, c.raw, `${c.raw} legacyKey`);
}

assert.equal(proposalGoalToPlanner("awareness"), "brand");
assert.equal(proposalGoalToPlanner("conversion"), "sales");
assert.equal(proposalGoalToPlanner("event"), "event");

assert.equal(plannerGoalToProposalGoal("launch"), "awareness");
assert.equal(plannerGoalToProposalGoal("local"), "conversion");
assert.equal(plannerGoalToProposalGoal("event"), "event");
assert.equal(plannerGoalToProposalGoal("sales"), "conversion");

assert.deepEqual(plannerGoalToContactGoals("launch"), ["product_launch"]);
assert.deepEqual(plannerGoalToContactGoals("local"), ["store_traffic"]);

console.log(`normalizeCampaignGoal: ${cases.length} cases OK`);
console.log("prefill round-trip: launch/local preserved via displayKey");
