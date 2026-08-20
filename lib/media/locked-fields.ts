import { isKoreaMediaCountry } from "@/lib/media-country";

/**
 * Computed 계층 필드 — 관리자 편집 불가
 * PR4: 3층(모달 UI / JSON edit / API PATCH·PUT) 모두 이 상수만 참조
 * `reviewStatus` / `reviewReason` / `flaggedAt` 은 Operational 이라 여기 넣지 않음.
 */
export const COMPUTED_FIELDS_LOCKED = [
  "dailyFootfall",
  "weekdayFootfall",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "engagementRate",
  "visibilityScore",
] as const;

export type LockedField = (typeof COMPUTED_FIELDS_LOCKED)[number];

/** quick-add / bulk-import JSON snake_case → LockedField */
export const LOCKED_FIELD_SNAKE_ALIASES: Record<string, LockedField> = {
  daily_footfall: "dailyFootfall",
  weekday_footfall: "weekdayFootfall",
  impressions: "impressions",
  reach: "reach",
  frequency: "frequency",
  cpm: "cpm",
  engagement_rate: "engagementRate",
  visibility_score: "visibilityScore",
};

export function isLockedField(name: string): name is LockedField {
  return (COMPUTED_FIELDS_LOCKED as readonly string[]).includes(name);
}

export function isLockedFormField(name: string): boolean {
  return isLockedField(name) || name in LOCKED_FIELD_SNAKE_ALIASES;
}

export const LOCKED_FIELD_TOOLTIP =
  "이 값은 좌표·매체정보를 기반으로 자동 계산됩니다. 편집이 필요하면 매체 정보(위치·규격 등)를 수정해 주세요.";

/**
 * 입력 객체에서 잠금 필드를 제거하고 어떤 필드가 제거됐는지 반환.
 * API PATCH/PUT과 JSON edit 저장 시 사용.
 */
export function stripLockedFields<T extends Record<string, unknown>>(
  input: T,
): {
  cleaned: Partial<T>;
  stripped: LockedField[];
} {
  const cleaned = { ...input } as Record<string, unknown>;
  const stripped: LockedField[] = [];

  for (const key of COMPUTED_FIELDS_LOCKED) {
    if (key in cleaned) {
      stripped.push(key);
      delete cleaned[key];
    }
  }

  for (const [snake, camel] of Object.entries(LOCKED_FIELD_SNAKE_ALIASES)) {
    if (snake in cleaned && !stripped.includes(camel)) {
      stripped.push(camel);
      delete cleaned[snake];
    }
  }

  return { cleaned: cleaned as Partial<T>, stripped };
}

/** 해외 매체 — 유동인구는 한국 자동 추정 없음 → admin 수동 입력 허용 */
const OVERSEAS_MANUAL_FOOTFALL: LockedField[] = [
  "dailyFootfall",
  "weekdayFootfall",
];

export function stripLockedFieldsForMediaSave<T extends Record<string, unknown>>(
  input: T,
  country?: string | null,
): {
  cleaned: Partial<T>;
  stripped: LockedField[];
} {
  if (isKoreaMediaCountry(country)) {
    return stripLockedFields(input);
  }
  const preserved = {} as Partial<T>;
  for (const key of OVERSEAS_MANUAL_FOOTFALL) {
    if (key in input) {
      preserved[key as keyof T] = input[key as keyof T];
    }
  }
  const { cleaned, stripped } = stripLockedFields(input);
  return {
    cleaned: { ...cleaned, ...preserved },
    stripped: stripped.filter((f) => !OVERSEAS_MANUAL_FOOTFALL.includes(f)),
  };
}
