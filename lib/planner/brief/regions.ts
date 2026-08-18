/**
 * PR-6a 브리프 — 행정 표준 17개 시도 지역 모델.
 *
 * 기존 플래너(`lib/planner/planner-regions.ts`)와 매체 필터
 * (`lib/media-browse-regions.ts`)는 충청·경상·전라를 하나로 묶은 14개
 * 그룹만 노출했다. 통합 브리프는 광고주가 실제로 인지하는 17개 시도를
 * 그대로 선택하게 한다.
 *
 * `code` 는 행정표준 2자리 시도 코드 — `CampaignPlanBrief.regionCodes`
 * (docs #394, `lib/campaign-plan-schema.ts`) 저장 형식과 일치한다.
 *
 * `browseMainId` 는 이 시도를 포함하는 매체 필터 그룹(14개)으로의 역매핑.
 * PR-6b 에서 카탈로그를 필터링할 때 17개 선택 → browse 그룹으로 변환한다.
 * (데이터 정확도·매체 커버리지 재배선은 이번 범위 아님 — 구조만 만든다.)
 */

export type SidoCode =
  | "11" // 서울
  | "26" // 부산
  | "27" // 대구
  | "28" // 인천
  | "29" // 광주
  | "30" // 대전
  | "31" // 울산
  | "36" // 세종
  | "41" // 경기
  | "42" // 강원
  | "43" // 충북
  | "44" // 충남
  | "45" // 전북
  | "46" // 전남
  | "47" // 경북
  | "48" // 경남
  | "50"; // 제주

export type SidoRegion = {
  code: SidoCode;
  ko: string;
  en: string;
  /** 매체 필터 그룹(14개) id — PR-6b 카탈로그 필터 역매핑 */
  browseMainId: string;
};

/**
 * 행정 표준 순서. 세종(36)은 별도 코드지만 매체 필터에서는 충청 그룹에
 * 속한다(별도 browse 그룹 없음). 강원·전북은 특별자치도 개편 전 표준 코드
 * (42/45)를 유지 — 매체 데이터가 아직 이 코드 기준이므로 정합을 맞춘다.
 */
export const SIDO_REGIONS: readonly SidoRegion[] = [
  { code: "11", ko: "서울", en: "Seoul", browseMainId: "seoul" },
  { code: "26", ko: "부산", en: "Busan", browseMainId: "busan" },
  { code: "27", ko: "대구", en: "Daegu", browseMainId: "daegu" },
  { code: "28", ko: "인천", en: "Incheon", browseMainId: "incheon" },
  { code: "29", ko: "광주", en: "Gwangju", browseMainId: "gwangju" },
  { code: "30", ko: "대전", en: "Daejeon", browseMainId: "daejeon" },
  { code: "31", ko: "울산", en: "Ulsan", browseMainId: "ulsan" },
  { code: "36", ko: "세종", en: "Sejong", browseMainId: "chungcheong" },
  { code: "41", ko: "경기", en: "Gyeonggi", browseMainId: "gyeonggi" },
  { code: "42", ko: "강원", en: "Gangwon", browseMainId: "gangwon" },
  { code: "43", ko: "충북", en: "Chungbuk", browseMainId: "chungcheong" },
  { code: "44", ko: "충남", en: "Chungnam", browseMainId: "chungcheong" },
  { code: "45", ko: "전북", en: "Jeonbuk", browseMainId: "jeolla" },
  { code: "46", ko: "전남", en: "Jeonnam", browseMainId: "jeolla" },
  { code: "47", ko: "경북", en: "Gyeongbuk", browseMainId: "gyeongsang" },
  { code: "48", ko: "경남", en: "Gyeongnam", browseMainId: "gyeongsang" },
  { code: "50", ko: "제주", en: "Jeju", browseMainId: "jeju" },
] as const;

const BY_CODE = new Map<string, SidoRegion>(
  SIDO_REGIONS.map((r) => [r.code, r]),
);

export function isSidoCode(v: unknown): v is SidoCode {
  return typeof v === "string" && BY_CODE.has(v);
}

/** 저장값(문자열/배열) → 유효한 시도 코드 배열 (중복·무효 제거, 표준 순서 정렬) */
export function normalizeSidoCodes(raw: unknown): SidoCode[] {
  const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const seen = new Set<SidoCode>();
  for (const v of arr) {
    if (isSidoCode(v)) seen.add(v);
  }
  // 표준 순서로 정렬해 저장·표시 일관성 유지
  return SIDO_REGIONS.filter((r) => seen.has(r.code)).map((r) => r.code);
}

export function sidoLabel(code: SidoCode, isKo: boolean): string {
  const row = BY_CODE.get(code);
  if (!row) return code;
  return isKo ? row.ko : row.en;
}

/** 선택된 17개 시도 코드 → 매체 필터 그룹(14개) id 집합 (PR-6b 카탈로그 필터) */
export function sidoCodesToBrowseMainIds(codes: readonly SidoCode[]): string[] {
  const out = new Set<string>();
  for (const c of codes) {
    const row = BY_CODE.get(c);
    if (row) out.add(row.browseMainId);
  }
  return [...out];
}

/**
 * 매체 필터 그룹(14개) id → 그 그룹에 속한 17개 시도 코드.
 * 자연어 파서가 그룹 단위로 인식했을 때(예: "충청") 시도 코드로 확장한다.
 * "national" 은 전국(빈 배열 = 전 지역 의미)으로 처리한다.
 */
export function browseMainIdToSidoCodes(mainId: string): SidoCode[] {
  return SIDO_REGIONS.filter((r) => r.browseMainId === mainId).map(
    (r) => r.code,
  );
}

/** 라벨 요약 — "서울·경기 외 2" 형식 */
export function summarizeSidoCodes(
  codes: readonly SidoCode[],
  isKo: boolean,
  maxParts = 2,
): string {
  if (codes.length === 0) return isKo ? "전국" : "Nationwide";
  const labels = normalizeSidoCodes(codes).map((c) => sidoLabel(c, isKo));
  if (labels.length <= maxParts) return labels.join("·");
  const rest = labels.length - maxParts;
  const head = labels.slice(0, maxParts).join("·");
  return isKo ? `${head} 외 ${rest}` : `${head} +${rest}`;
}
