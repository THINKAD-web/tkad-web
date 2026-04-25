/**
 * Tavily / Claude 보강용 OOH 검색 키워드 풀.
 * cron 트리거마다 5~8개 무작위 선택 → 매번 같은 결과 반복 회피.
 *
 * 시즌별 가중치는 의도적으로 넣지 않음. 운영팀이 장기적으로 트래픽
 * 데이터 보고 가지치기 할 수 있게 평면 배열로 둠.
 */

const KEYWORDS_KO: readonly string[] = [
  "옥외광고 트렌드",
  "디지털 사이니지",
  "DOOH 광고",
  "프로그래매틱 OOH",
  "버스 외부광고",
  "지하철 광고",
  "공항 광고",
  "엘리베이터 광고",
  "전광판 LED",
  "옥외광고 사례",
  "OOH 효과 측정",
  "리테일 미디어",
  "유동인구 광고",
  "옥외광고 시장 규모",
  "스마트 사이니지",
  "버즈 캠페인",
  "옥외광고 ROI",
  "커넥티드 OOH",
  "AI 광고 분석",
  "시청률 측정 옥외",
  "DOOH 매체별 효율",
  "옥외광고 제안서",
  "TVC 옥외 연계",
  "오프라인 미디어 광고",
  "성수 광고",
  "강남 LED",
  "코엑스 광고",
  "홍대 광고",
];

const KEYWORDS_EN: readonly string[] = [
  "OOH advertising trends",
  "DOOH programmatic",
  "digital out-of-home",
  "outdoor advertising market",
  "retail media network",
  "billboard analytics",
  "smart signage",
  "connected DOOH",
  "OOH attribution",
  "transit advertising",
  "airport advertising",
  "wallscape media",
  "OOH measurement",
  "OOH ROI study",
  "outdoor campaign case study",
  "screen-based advertising",
  "OOH creative best practice",
  "DOOH inventory",
  "place-based media",
  "out-of-home media buying",
  "audience-based DOOH",
  "OOH industry report",
  "place-based audience",
  "context-aware advertising",
];

export const OOH_KEYWORD_POOL = {
  ko: KEYWORDS_KO,
  en: KEYWORDS_EN,
} as const;

/**
 * 풀에서 무작위 N 개 추출 (중복 없이).
 * count 가 풀 크기 초과 시 풀 전체 반환.
 */
export function pickKeywords(
  count: number,
  locale: "ko" | "en" | "mixed" = "mixed",
): string[] {
  const source =
    locale === "ko"
      ? [...KEYWORDS_KO]
      : locale === "en"
        ? [...KEYWORDS_EN]
        : [...KEYWORDS_KO, ...KEYWORDS_EN];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, Math.max(1, Math.min(count, source.length)));
}
