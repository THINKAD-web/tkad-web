/** 파서 실측으로 검증된 자유입력 예시 (0토큰 칩용) */
export const FREETEXT_EXAMPLE_PROMPTS_KO = [
  "강남 2030 브랜딩 3000만원",
  "부산 해운대 40대 금융 프로모션 5천만원 분기",
  "성수 팝업스토어 20대 카페 1억 반년",
  "명동 로컬 상권 300만원",
  "을지로 F&B 매출 700만원",
  "전국 30대 테크 브랜드 인지",
  "지하철 IT 런칭 500만",
  "버스 래핑 브랜딩 1000만",
  "강남 택시 브랜딩",
] as const;

/** 첫 화면 노출 4개 — 실측 적합 샘플만 */
export const FREETEXT_CHIP_PROMPTS_KO = [
  "부산 해운대 40대 금융 프로모션 5천만원 분기",
  "성수 팝업스토어 20대 카페 1억 반년",
  "강남 택시 브랜딩",
  "강남 2030 브랜딩 3000만원",
] as const;

export const FREETEXT_CHIP_PROMPTS_EN = [
  "Busan Haeundae finance promo 50M quarterly",
  "Gangnam 2030 branding 30M KRW",
  "Bus wrap branding 10M",
  "Subway IT launch 5M",
] as const;

export const FREETEXT_EXAMPLE_PROMPTS_EN = [
  "Gangnam 2030 branding 30M KRW",
  "Hongdae beauty launch 5M monthly 3 months",
  "Busan Haeundae finance promo 50M quarterly",
  "Myeongdong local 3M KRW",
  "Subway IT launch 5M",
  "Bus wrap branding 10M",
] as const;

export const FREETEXT_EXAMPLE_CHIP_COUNT = 4;

/** 결정적 shuffle — 동일 seed 에서 동일 4개 */
export function pickFreetextExamplePrompts(
  pool: readonly string[],
  count: number,
  seed: number,
): string[] {
  const items = [...pool];
  let s = seed >>> 0 || 1;
  for (let i = items.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items.slice(0, Math.min(count, items.length));
}

/** 이전 노출 세트를 최대한 제외하고 선택 (풀 부족 시 나머지 슬롯만 보충) */
export function pickFreetextExamplePromptsExcluding(
  pool: readonly string[],
  count: number,
  seed: number,
  exclude: readonly string[],
): string[] {
  const excludeSet = new Set(exclude);
  const need = Math.min(count, pool.length);
  const available = pool.filter((item) => !excludeSet.has(item));

  if (available.length >= need) {
    return pickFreetextExamplePrompts(available, need, seed);
  }

  const primary = pickFreetextExamplePrompts(
    available,
    available.length,
    seed,
  );
  const slotsLeft = need - primary.length;
  if (slotsLeft <= 0) return primary;

  const fallbackPool = pool.filter((item) => !primary.includes(item));
  const filler = pickFreetextExamplePrompts(fallbackPool, slotsLeft, seed + 1);
  return [...primary, ...filler];
}

/** LCG — 결정적 다음 seed */
export function nextFreetextExampleSeed(seed: number): number {
  return ((seed >>> 0 || 1) * 1664525 + 1013904223) >>> 0 || 1;
}
