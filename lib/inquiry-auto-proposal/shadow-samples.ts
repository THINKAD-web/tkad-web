import { PILOT_DEFAULT_INQUIRY_TEXT } from "./pilot-skus";

/** Shadow diff 배치 실행용 고정 샘플 (dry-run 이력 DB 없음 → 재현 가능 fixture) */
export const INQUIRY_SHADOW_SAMPLE_CASES = [
  {
    id: "pilot-default",
    label: "파일럿 기본 (인천공항 지정 5 SKU + 휴게소 LED)",
    text: PILOT_DEFAULT_INQUIRY_TEXT,
  },
  {
    id: "four-region-mix",
    label: "4개 지역 동시 문의 (서울·부산·대구·인천)",
    text: `브랜드 인지도 향상 캠페인
기간 2개월

[서울] 예산 2,000만원 — 지하철·강남 일대 노출 희망
[부산] 예산 1,500만원 — 시외버스터미널·전광판
[대구] 예산 1,000만원 — 택배차량 래핑
[인천] 예산 2,500만원 — 인천공항 DOOH`,
  },
  {
    id: "named-subset-budget",
    label: "지정 SKU 2개 + 예산 2,000만",
    text: `인천공항 T1 키로뷰 광고
인천공항 T2 키로뷰 광고
예산 2,000만원
1개월`,
  },
  {
    id: "rest-stop-led-only",
    label: "휴게소 LED만 (카테고리 확장)",
    text: `휴게소 LED 전광판
예산 1,500만원
기간 1개월`,
  },
  {
    id: "seoul-subway-national",
    label: "서울 지하철 + 전국 인지도",
    text: `신규 앱 런칭, 20대 MZ 타겟
서울 지하철 2호선·강남역 일대
예산 5,000만원
3개월`,
  },
  {
    id: "budget-assumed-airport",
    label: "예산 미기재 + 인천공항",
    text: `인천국제공항 키로뷰 Full Package 광고
인천공항 T1 체크인 스퀘어 광고
기간 1개월`,
  },
] as const;
