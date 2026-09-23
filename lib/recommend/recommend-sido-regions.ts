/**
 * AI recommend 구조화 UI — 17개 시도 + 전국.
 * 브리프 `lib/planner/brief/regions.ts` SSOT 재사용.
 */

import {
  isSidoCode,
  normalizeSidoCodes,
  sidoCodesToBrowseMainIds,
  sidoLabel,
  type SidoCode,
} from "@/lib/planner/brief/regions";
/** 구조화 UI·세션 저장용 — 행정 시도 코드 또는 전국 */
export type RecommendRegionCode = SidoCode | "national";

const NON_SPECIFIC = new Set([
  "all",
  "national",
  "nationwide",
  "",
  "전국",
  "전체",
]);

function isNonSpecificRecommendCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (NON_SPECIFIC.has(trimmed)) return true;
  if (NON_SPECIFIC.has(trimmed.toLowerCase())) return true;
  return false;
}

const LEGACY_MACRO_TO_SIDO: Record<string, readonly SidoCode[]> = {
  seoul: ["11"],
  busan: ["26"],
  incheon: ["28"],
  jeju: ["50"],
  gyeonggi: ["41"],
  /** 레거시 UI 라벨 "경기" — 실제로는 수도권(서울·경기·인천) */
  capital: ["11", "41", "28"],
};

/** 세션·API 입력 → 표준 시도 코드 (레거시 macro 호환) */
export function normalizeRecommendRegionCodes(
  raw: readonly string[],
): SidoCode[] {
  const collected: SidoCode[] = [];
  for (const code of raw) {
    const trimmed = code.trim();
    if (!trimmed || isNonSpecificRecommendCode(trimmed)) {
      continue;
    }
    if (isSidoCode(trimmed)) {
      collected.push(trimmed);
      continue;
    }
    const legacy = LEGACY_MACRO_TO_SIDO[trimmed];
    if (legacy) collected.push(...legacy);
  }
  return normalizeSidoCodes(collected);
}

export function isRecommendNationwideSelection(raw: readonly string[]): boolean {
  if (raw.length === 0) return true;
  return raw.every((c) => isNonSpecificRecommendCode(c));
}

/** AI recommend → browse `regionMain` id (하드 프리필터) */
export function recommendRegionCodesToPlannerIds(
  raw: readonly string[],
): string[] | undefined {
  if (isRecommendNationwideSelection(raw)) return undefined;

  const sido = normalizeRecommendRegionCodes(raw);
  if (sido.length > 0) {
    return [...new Set(sidoCodesToBrowseMainIds(sido))];
  }

  /** 레거시 browse macro만 있는 경우 (파서·구 세션) */
  const legacy = raw
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !isNonSpecificRecommendCode(c));

  if (legacy.includes("capital")) {
    const rest = legacy.filter((c) => c !== "capital");
    return [...new Set([...["seoul", "gyeonggi", "incheon"], ...rest])];
  }
  return legacy.length > 0 ? [...new Set(legacy)] : undefined;
}

export function recommendRegionLabel(
  code: string,
  isKo: boolean,
  nationalShort?: string,
): string {
  if (code === "national") {
    return nationalShort ?? (isKo ? "전국" : "National");
  }
  if (isSidoCode(code)) return sidoLabel(code, isKo);
  return code;
}

export function summarizeRecommendRegionCodes(
  codes: readonly RecommendRegionCode[],
  isKo: boolean,
  maxParts = 4,
): string {
  const sido = normalizeRecommendRegionCodes(codes);
  if (sido.length === 0) return isKo ? "전국" : "Nationwide";
  const labels = sido.map((c) => sidoLabel(c, isKo));
  if (labels.length <= maxParts) return labels.join("·");
  const rest = labels.length - maxParts;
  const head = labels.slice(0, maxParts).join("·");
  return isKo ? `${head} 외 ${rest}` : `${head} +${rest}`;
}

export function recommendSelectionHasSido(
  selection: ReadonlySet<RecommendRegionCode>,
  code: SidoCode,
): boolean {
  if (selection.has(code)) return true;
  return normalizeRecommendRegionCodes([...selection]).includes(code);
}
