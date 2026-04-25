/**
 * 매체 시간대·요일·월별 유동인구 추정 헬퍼.
 *
 * `Media.trafficPattern` 이 비어 있는 매체에 대해 지역·매체유형 기반의
 * 휴리스틱 분포를 생성한다. 모든 값은 0~1 정규화 가중치이며, 실제 표시는
 * `dailyFootfall` 또는 `monthlyFootTraffic` 같은 절대값과 곱해서 사용한다.
 *
 * 정확한 측정치가 아니므로 UI 에서 반드시 "추정치" 라벨을 함께 노출한다.
 */

export type TrafficPattern = {
  hourly: number[];   // length 24
  weekly: number[];   // length 7  (월~일)
  monthly: number[];  // length 12 (1월~12월)
  updatedAt?: string;
};

export type StoredTrafficPattern = Partial<TrafficPattern>;

/** 시간대 24, 요일 7, 월 12 길이 검증 + 정규화 (합 = 1) */
function normalize(arr: readonly number[], length: number): number[] {
  if (arr.length !== length) return Array(length).fill(1 / length);
  const sum = arr.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return Array(length).fill(1 / length);
  return arr.map((v) => Math.max(0, v) / sum);
}

// ─────────────────────────────────────────────────────────────────
// 매체 유형별 시간대 분포 (24h)
// digital — 출퇴근 + 점심 + 야간 점등 시간대 강세
// static — 낮 자연광 시간대 강세, 야간 약세
// mobile — 출퇴근·점심 강세 (버스·지하철 운행)
// network — 평균에 가까운 분포
// ─────────────────────────────────────────────────────────────────
const HOURLY_BY_TYPE: Record<string, readonly number[]> = {
  digital: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.55, 0.85, 1.0, 0.7, 0.65, 0.7,
    0.95, 0.9, 0.7, 0.75, 0.85, 1.0, 1.0, 0.95, 0.85, 0.75, 0.5, 0.3,
  ],
  static: [
    0.1, 0.05, 0.05, 0.05, 0.1, 0.25, 0.45, 0.7, 0.85, 0.9, 0.95, 1.0,
    1.0, 0.95, 0.85, 0.85, 0.9, 0.95, 0.8, 0.6, 0.4, 0.25, 0.15, 0.1,
  ],
  mobile: [
    0.15, 0.1, 0.05, 0.05, 0.1, 0.4, 0.85, 1.0, 0.95, 0.7, 0.7, 0.85,
    0.95, 0.85, 0.7, 0.7, 0.85, 1.0, 1.0, 0.85, 0.65, 0.45, 0.3, 0.2,
  ],
  network: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.35, 0.6, 0.85, 0.95, 0.85, 0.8, 0.85,
    0.95, 0.9, 0.8, 0.8, 0.9, 1.0, 0.95, 0.85, 0.7, 0.55, 0.4, 0.25,
  ],
};

// ─────────────────────────────────────────────────────────────────
// 요일 분포 (월 ~ 일)
// 서울 도심·강남 — 평일 강세 (오피스), 주말 약세
// 명동·홍대 등 관광/유흥 상권 — 주말 강세
// 부산·제주 — 관광지 영향, 주말 강세
// 기본 — 평일 약간 강세
// ─────────────────────────────────────────────────────────────────
const WEEKLY_BY_REGION: Record<string, readonly number[]> = {
  seoul:    [1.0, 1.0, 1.05, 1.05, 1.15, 0.95, 0.85],
  busan:    [0.9, 0.9, 0.95, 0.95, 1.05, 1.15, 1.1],
  jeju:     [0.85, 0.85, 0.9, 0.9, 1.05, 1.25, 1.2],
  national: [0.95, 0.95, 1.0, 1.0, 1.05, 1.05, 1.0],
};

// ─────────────────────────────────────────────────────────────────
// 월별 분포 (1월 ~ 12월)
// 한국 옥외광고 시장 일반 패턴: 12월(연말 캠페인) > 5월(가정의달) > 9월(추석/가을) 강세
// 1·2월·8월(혹서기) 약세
// ─────────────────────────────────────────────────────────────────
const MONTHLY_DEFAULT: readonly number[] = [
  0.85, 0.85, 0.95, 1.0, 1.1, 1.0, 0.95, 0.9, 1.05, 1.1, 1.05, 1.2,
];

// 제주 — 7~8월 여름 성수기, 12월 송년 약세
const MONTHLY_JEJU: readonly number[] = [
  0.85, 0.85, 0.95, 1.05, 1.15, 1.1, 1.25, 1.25, 1.1, 1.0, 0.9, 0.95,
];

export function estimateHourly(mediaType: string): number[] {
  const base = HOURLY_BY_TYPE[mediaType] ?? HOURLY_BY_TYPE.network;
  return normalize(base, 24);
}

export function estimateWeekly(region: string): number[] {
  const base =
    WEEKLY_BY_REGION[region] ?? WEEKLY_BY_REGION.national;
  return normalize(base, 7);
}

export function estimateMonthly(region: string): number[] {
  const base = region === "jeju" ? MONTHLY_JEJU : MONTHLY_DEFAULT;
  return normalize(base, 12);
}

/**
 * 저장된 패턴이 있으면 그 값을 정규화해서 반환, 없으면 추정값 + isEstimated 플래그.
 */
export function resolveTrafficPattern(
  stored: StoredTrafficPattern | null | undefined,
  mediaType: string,
  region: string,
): { pattern: TrafficPattern; isEstimated: boolean } {
  const hourlyOk = Array.isArray(stored?.hourly) && stored.hourly.length === 24;
  const weeklyOk = Array.isArray(stored?.weekly) && stored.weekly.length === 7;
  const monthlyOk =
    Array.isArray(stored?.monthly) && stored.monthly.length === 12;
  const allReal = hourlyOk && weeklyOk && monthlyOk;

  const hourly = hourlyOk
    ? normalize(stored!.hourly!, 24)
    : estimateHourly(mediaType);
  const weekly = weeklyOk
    ? normalize(stored!.weekly!, 7)
    : estimateWeekly(region);
  const monthly = monthlyOk
    ? normalize(stored!.monthly!, 12)
    : estimateMonthly(region);

  return {
    pattern: { hourly, weekly, monthly, updatedAt: stored?.updatedAt },
    isEstimated: !allReal,
  };
}

// ─────────────────────────────────────────────────────────────────
// 인사이트 텍스트 자동 생성
// ─────────────────────────────────────────────────────────────────

const HOUR_LABELS_KO = [
  "출근(7~9시)",
  "점심(12~13시)",
  "퇴근(18~20시)",
  "야간(21~23시)",
];
const HOUR_RANGES = [
  [7, 9],
  [12, 13],
  [18, 20],
  [21, 23],
] as const;

const WEEKDAY_LABELS_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_LABELS_KO = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

function rangeAvg(arr: number[], start: number, endInclusive: number): number {
  let sum = 0;
  for (let i = start; i <= endInclusive; i++) sum += arr[i];
  return sum / (endInclusive - start + 1);
}

function indexOfMax(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}

export type TrafficInsights = {
  peakHourLabel: string;
  peakWeekdayLabel: string;
  peakMonthLabel: string;
};

export function buildInsights(
  pattern: TrafficPattern,
  isKo: boolean,
): TrafficInsights {
  // 시간대 — 4개 구간 중 평균 가장 높은 라벨
  const slotAvgs = HOUR_RANGES.map(([s, e]) => rangeAvg(pattern.hourly, s, e));
  const peakSlotIdx = indexOfMax(slotAvgs);
  const peakHourLabelKo = HOUR_LABELS_KO[peakSlotIdx];
  const peakHourLabelEn = [
    "Morning rush (7-9)",
    "Lunch (12-13)",
    "Evening rush (18-20)",
    "Night (21-23)",
  ][peakSlotIdx];

  // 요일
  const peakWdIdx = indexOfMax(pattern.weekly);
  const peakWeekdayLabel = isKo
    ? `${WEEKDAY_LABELS_KO[peakWdIdx]}요일`
    : WEEKDAY_LABELS_EN[peakWdIdx];

  // 월
  const peakMonthIdx = indexOfMax(pattern.monthly);
  const peakMonthLabel = isKo
    ? MONTH_LABELS_KO[peakMonthIdx]
    : new Date(2000, peakMonthIdx, 1).toLocaleString("en-US", {
        month: "long",
      });

  return {
    peakHourLabel: isKo ? peakHourLabelKo : peakHourLabelEn,
    peakWeekdayLabel,
    peakMonthLabel,
  };
}
