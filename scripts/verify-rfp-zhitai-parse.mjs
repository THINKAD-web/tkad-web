/**
 * Live Claude (or heuristic fallback) verification for ZHITAI RFP fixture.
 * Usage: node --import tsx scripts/verify-rfp-zhitai-parse.mjs
 *        RFP_HEURISTIC_ONLY=1 node --import tsx scripts/verify-rfp-zhitai-parse.mjs
 */
import assert from "node:assert/strict";
import { ZHITAI_RFP_EMAIL } from "../lib/rfp-proposal/fixtures/zhitai-rfp.ts";
import { assertZhitaiBrief } from "../lib/rfp-proposal/assert-zhitai.ts";
import { parseRfpProposalBrief } from "../lib/rfp-proposal/parse-rfp-brief.ts";

const heuristicOnly = process.env.RFP_HEURISTIC_ONLY === "1";

const { brief, source } = await parseRfpProposalBrief(ZHITAI_RFP_EMAIL, {
  locale: "ko",
  heuristicOnly,
});

console.log("source:", source);
console.log(
  "groups:",
  brief.groups.map((g) => ({
    label: g.label,
    regions: g.regionKeywords,
    media: g.mediaTypeKeywords,
  })),
);
console.log("campaign:", brief.campaign);

assertZhitaiBrief(brief);
assert.ok(brief.groups.length >= 3);
console.log("OK: ZHITAI RFP structure verified");
