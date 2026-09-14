/**
 * 파서 실측으로 검증된 자유입력 예시 (0토큰 칩용).
 * 지역·업종·예산 규모·캠페인 목적 4축을 고르게 커버 — `freetext-example-prompts.test.ts`
 * 에서 전 항목이 `parsePlannerFreetextBrief` 로 최소 1개 필드 이상 추출되는지 회귀 검증.
 */
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
  "대구 동성로 게임 콘서트 인지도 2000만원",
  "인천공항 리테일 오픈 프로모션 6000만원",
  "판교 스타트업 신제품 런칭 800만원",
  "수원 카페 매출 프로모션 1500만원",
  "제주 서귀포 여름 시즌 프로모션 3500만원",
  "광주 콘서트 신규 오픈 1200만원",
  "대전 둔산 카페 브랜딩",
  "여의도 패션 매장 오픈 1.5억원",
] as const;

/** 첫 화면 노출 4개 — 지역·업종·목적·예산 규모가 서로 겹치지 않도록 선정 */
export const FREETEXT_CHIP_PROMPTS_KO = [
  "판교 스타트업 신제품 런칭 800만원",
  "부산 해운대 40대 금융 프로모션 5천만원 분기",
  "명동 로컬 상권 300만원",
  "대구 동성로 게임 콘서트 인지도 2000만원",
] as const;

export const FREETEXT_CHIP_PROMPTS_EN = [
  "Pangyo Gyeonggi SaaS launch 8M",
  "Busan Haeundae finance promo 50M quarterly",
  "Myeongdong local 3M KRW",
  "Daegu game concert awareness 20M",
] as const;

export const FREETEXT_EXAMPLE_PROMPTS_EN = [
  "Gangnam 2030 branding 30M KRW",
  "Hongdae beauty launch 5M monthly 3 months",
  "Busan Haeundae finance promo 50M quarterly",
  "Myeongdong local 3M KRW",
  "Subway IT launch 5M",
  "Bus wrap awareness 10M",
  "Daegu game concert awareness 20M",
  "Incheon Airport retail promotion 60M",
  "Pangyo Gyeonggi SaaS launch 8M",
  "Suwon Gyeonggi cafe sales 15M",
  "Jeju Seogwipo summer promotion 35M",
  "Gwangju concert launch 12M",
  "Daejeon cafe branding",
  "Yeouido fashion store launch 150M",
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
