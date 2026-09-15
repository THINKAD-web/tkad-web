import { extractLocationKeywordsFromZones } from "@/lib/planner/freetext-location-from-zones";
import {
  parseOohKeywordIntentsFromText,
  type OohKeywordIntent,
} from "@/lib/planner/keyword-intent-map";
import { effectiveFreetextForMediaParsing } from "@/lib/planner/strip-query-modifiers";

/** 자연어에서 추출한 매체 유형 의도 — scoreCategory 가점·감점 */
export type FreetextMediaIntent = OohKeywordIntent;

export function parseFreetextMediaIntents(text: string): FreetextMediaIntent[] {
  const t = effectiveFreetextForMediaParsing(text.trim());
  if (!t) return [];

  const intents = new Set(parseOohKeywordIntentsFromText(t));

  if (
    /(?:\d+\s*호선|신분당\s*선|경의[\s·]?중앙\s*선|공항\s*철도|\barex\b|분당\s*선|인천\s*[12]\s*호선)/i.test(
      t,
    )
  ) {
    intents.add("subway");
  }

  return [...intents];
}

/** 지역 스코어·하드필터 보조 — seoulZones 등 zone SSOT 연동 */
export function extractFreetextLocationKeywords(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (kw: string) => {
    const k = kw.trim();
    if (k.length < 2) return;
    const key = k.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(k);
  };

  for (const kw of extractLocationKeywordsFromZones(t)) {
    push(kw);
  }

  return out;
}
