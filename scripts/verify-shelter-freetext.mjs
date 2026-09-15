#!/usr/bin/env node
import { config } from "dotenv";
import { parsePlannerFreetextBrief } from "../lib/planner/parse-freetext-brief.ts";
import { buildAiRecommendInputFromFreetext } from "../lib/recommend/build-freetext-recommend-input.ts";
import { plannerFreetextToRecommendBrief } from "../lib/recommend/planner-freetext-to-recommend-brief.ts";
import { applyFreetextRecommendDraftDefaults } from "../lib/recommend/freetext-recommend-defaults.ts";
import { aiInputToMatching } from "../lib/recommendation-adapters.ts";
import { matchMediaCatalog } from "../lib/matching-engine.ts";
import { loadPublicMediaCatalogRowsFromDb } from "../lib/public-media-catalog.ts";

config({ path: ".env.local" });

async function main() {
const raw = "서울 쉘터 3000만원";
const parsed = parsePlannerFreetextBrief(raw);
const { draft } = applyFreetextRecommendDraftDefaults(
  { goal: "", target: "", budgetMan: "", region: "", industry: "" },
  parsed,
  true,
);
const brief = plannerFreetextToRecommendBrief(parsed, true);
const ai = buildAiRecommendInputFromFreetext(
  parsed,
  {
    ...draft,
    region: brief.region,
    goal: brief.goal,
    target: brief.target,
    industry: brief.industry,
    budgetMan: brief.budgetMan,
  },
  raw,
  true,
);

const catalog = await loadPublicMediaCatalogRowsFromDb();
const matchInput = aiInputToMatching(ai, catalog);
const results = matchMediaCatalog(catalog, matchInput).slice(0, 10);

console.log("mediaIntents:", ai?.mediaIntents);
console.log("plannerCategories:", ai?.plannerCategories);
console.log("\ntop10:");
for (const r of results) {
  console.log(
    `  [${r.precision}] ${r.media.name.slice(0, 48)} (category=${r.breakdown.category})`,
  );
}

const shelterInTop = results.filter((r) => /쉘터|shelter/i.test(r.media.name));
const exactShelter = results.filter(
  (r) => r.precision === "exact" && /쉘터|shelter/i.test(r.media.name),
);
console.log("\nshelter in top10:", shelterInTop.length);
console.log("exact shelter in top10:", exactShelter.length);

const subwayRegression = parsePlannerFreetextBrief("강남 지하철광고 3000만원");
console.log(
  "\nregression subway categories:",
  subwayRegression.fields.categories.value,
);

process.exit(shelterInTop.length >= 3 && exactShelter.length >= 1 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
