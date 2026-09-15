import {
  detectOohMediaKeywordPresence,
  parseOohKeywordIntentsFromText,
} from "@/lib/planner/keyword-intent-map";

export type QueryModifierCategory =
  | "cost"
  | "agency"
  | "information";

export type StrippedQueryModifier = {
  category: QueryModifierCategory;
  matched: string;
};

export type StripQueryModifiersResult = {
  /** 원문 (호출측 normalize 후) */
  original: string;
  /** 수식어 제거 후 텍스트 — 미적용 시 original 과 동일 */
  text: string;
  stripped: StrippedQueryModifier[];
  /** 매체/채널 키워드가 있어서 수식어 제거를 시도했는지 */
  applied: boolean;
};

type ModifierRule = {
  category: QueryModifierCategory;
  re: RegExp;
};

/** 문의 의도 수식어 — 매체 키워드와 별도 */
const QUERY_MODIFIER_RULES: readonly ModifierRule[] = [
  { category: "cost", re: /최소\s*비용|광고\s*료|임대\s*료|비\s*용|가\s*격|단\s*가|견\s*적|시\s*세/gi },
  { category: "agency", re: /대\s*행\s*사|대\s*행|광고\s*업\s*체|업\s*체/gi },
  {
    category: "information",
    re: /효\s*과|종\s*류|하\s*는\s*법|허\s*가|신\s*고|설\s*치\s*기\s*준|기\s*준|방\s*법|추\s*천/gi,
  },
];

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 자유입력에서 문의 수식어 제거.
 * **매체/채널 키워드가 없으면 원문 그대로** — 엉뚱한 매칭 방지.
 */
export function stripQueryModifiers(text: string): StripQueryModifiersResult {
  const original = text.trim();
  if (!original) {
    return { original, text: original, stripped: [], applied: false };
  }

  if (!detectOohMediaKeywordPresence(original)) {
    return { original, text: original, stripped: [], applied: false };
  }

  let working = original;
  const stripped: StrippedQueryModifier[] = [];

  for (const rule of QUERY_MODIFIER_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(working)) !== null) {
      stripped.push({ category: rule.category, matched: m[0].trim() });
    }
    rule.re.lastIndex = 0;
    working = working.replace(rule.re, " ");
  }

  working = collapseWhitespace(working);

  if (stripped.length === 0) {
    return { original, text: original, stripped: [], applied: false };
  }

  // 수식어만 제거했더니 매체 신호가 사라지면 롤백
  if (
    !detectOohMediaKeywordPresence(working) &&
    parseOohKeywordIntentsFromText(working).length === 0
  ) {
    return { original, text: original, stripped: [], applied: false };
  }

  return {
    original,
    text: working.length > 0 ? working : original,
    stripped,
    applied: true,
  };
}

/** 파서·intent 추출용 — 수식어 제거 적용 후 텍스트 */
export function effectiveFreetextForMediaParsing(normalizedText: string): string {
  return stripQueryModifiers(normalizedText).text;
}
