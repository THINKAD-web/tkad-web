/**
 * engagementRate=0.65 등 placeholder — 본문·메모에 검증 가능한 근거가 없으면 DB null 권장.
 */

export const ENGAGEMENT_PLACEHOLDER_RATE = 0.65;
const PLACEHOLDER_MIN = 0.64;
const PLACEHOLDER_MAX = 0.66;

export const ENGAGEMENT_RATE_COPY_PATTERN =
  /참여율\s*[\d.]+\s*%|engagement\s*rate\s*[\d.]+\s*%|참여율\s*[\d.]+\s*\(\s*[\d.]+\s*%\s*\)/i;

/** 측정·출처 등으로 뒷받침된 참여율만 유지 */
export const ENGAGEMENT_RATE_SOURCE_PATTERN =
  /(?:출처|근거|측정|조사|실측|통계|기준\s*일|survey|measured|source\s*:|according\s+to)/i;

export function isPlaceholderEngagementRate(rate: number | null | undefined): boolean {
  if (rate == null || Number.isNaN(rate)) return false;
  return rate >= PLACEHOLDER_MIN && rate <= PLACEHOLDER_MAX;
}

function percentFromRate(rate: number): number {
  return rate <= 1 ? Math.round(rate * 100) : Math.round(rate);
}

function copyMatchesRate(text: string, rate: number): boolean {
  const pct = percentFromRate(rate);
  const decimal = rate <= 1 ? rate : rate / 100;
  return (
    new RegExp(`참여율\\s*${pct}\\s*%`, "i").test(text) ||
    new RegExp(`참여율\\s*${decimal}`, "i").test(text) ||
    new RegExp(`engagement\\s*rate\\s*${pct}`, "i").test(text)
  );
}

export type EngagementRateTrustInput = {
  engagementRate: number | null | undefined;
  description?: string | null;
  effectMemo?: string | null;
};

export type EngagementRateTrustDecision = {
  clearRate: boolean;
  reason: "not_placeholder" | "sourced_copy" | "placeholder_no_source";
};

/**
 * placeholder 구간(≈65%)이면서 description/effectMemo에 출처·측정 근거가 없으면 null 처리 대상.
 */
export function decidePlaceholderEngagementRate(
  input: EngagementRateTrustInput,
): EngagementRateTrustDecision {
  const rate = input.engagementRate;
  if (!isPlaceholderEngagementRate(rate)) {
    return { clearRate: false, reason: "not_placeholder" };
  }

  const blobs = [input.description, input.effectMemo].filter(Boolean) as string[];
  for (const text of blobs) {
    if (!ENGAGEMENT_RATE_COPY_PATTERN.test(text)) continue;
    if (!copyMatchesRate(text, rate!)) continue;
    if (ENGAGEMENT_RATE_SOURCE_PATTERN.test(text)) {
      return { clearRate: false, reason: "sourced_copy" };
    }
  }

  return { clearRate: true, reason: "placeholder_no_source" };
}

export type EngagementCopySanitizeResult = {
  next: string | null;
  changed: boolean;
  reason: "empty" | "no_pattern" | "sourced" | "stripped";
};

/**
 * effectMemo 등 — 근거(출처·측정) 없이 박힌 참여율 수치 문구 제거.
 * placeholder 0.65(65%) 및 동일 패턴의 무근거 % 서술 대상.
 */
export function sanitizeUnsourcedEngagementCopyInText(
  text: string | null | undefined,
): EngagementCopySanitizeResult {
  const raw = text?.trim() ?? "";
  if (!raw) {
    return { next: text ?? null, changed: false, reason: "empty" };
  }
  if (!ENGAGEMENT_RATE_COPY_PATTERN.test(raw)) {
    return { next: raw, changed: false, reason: "no_pattern" };
  }
  if (ENGAGEMENT_RATE_SOURCE_PATTERN.test(raw)) {
    return { next: raw, changed: false, reason: "sourced" };
  }

  let next = raw
    .replace(
      /참여율\s*0\.65\s*\(\s*65\s*%\s*\)\s*수준의\s*/gi,
      "",
    )
    .replace(/참여율\s*[\d.]+\s*\(\s*[\d.]+\s*%\s*\)\s*수준의\s*/gi, "")
    .replace(/참여율\s*[\d.]+\s*%\s*(?:수준의\s*)?/gi, "")
    .replace(/engagement\s*rate\s*[\d.]+\s*%?\s*(?:level\s*)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();

  if (next === raw) {
    return { next: raw, changed: false, reason: "no_pattern" };
  }

  return {
    next: next.length ? next : null,
    changed: true,
    reason: "stripped",
  };
}
