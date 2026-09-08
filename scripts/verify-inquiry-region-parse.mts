#!/usr/bin/env npx tsx
/** 실제 문의 케이스 파싱 결과 출력 — PR2 검증용 */
import {
  parseInquiryRegionBlocks,
  REAL_INQUIRY_ACCEPTANCE_CASE,
} from "../lib/inquiry-auto-proposal/parse-inquiry-regions.ts";
import { parseFreetextMediaIntentsDetailed } from "../lib/recommend/freetext-media-intents.ts";
import { parsePlannerFreetextBrief } from "../lib/planner/parse-freetext-brief.ts";

const text = process.argv[2] ?? REAL_INQUIRY_ACCEPTANCE_CASE;

const regions = parseInquiryRegionBlocks(text);
const media = parseFreetextMediaIntentsDetailed(text);
const brief = parsePlannerFreetextBrief(text);

console.log(
  JSON.stringify(
    {
      regions: {
        perRegionBudget: regions.perRegionBudget,
        blockCount: regions.blocks.length,
        blocks: regions.blocks.map((b) => ({
          label: b.label,
          regionCodes: b.regionCodes,
          locationKeywords: b.locationKeywords,
          budgetWon: b.budgetWon,
          months: b.months,
          source: b.source,
        })),
      },
      mediaIntents: {
        intents: media.intents,
        conditions: media.conditions,
        available: media.available.map((a) => ({
          intent: a.intent,
          noteKo: a.noteKo,
        })),
        unavailable: media.unavailable.map((u) => ({
          intent: u.intent,
          noteKo: u.noteKo,
        })),
        sources: media.sources,
      },
      brief: {
        industry: brief.fields.industryKey,
        budgetMan: brief.fields.budgetMan,
        months: brief.fields.months,
        regions: brief.fields.regions,
        categories: brief.fields.categories,
      },
    },
    null,
    2,
  ),
);
