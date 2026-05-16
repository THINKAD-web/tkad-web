/**
 * 크리에이티브 관리 시스템 공용 타입.
 * 클라이언트/서버 양쪽에서 import.
 */

export type CreativeKind = "image" | "video";

/** 라이브러리 카드/리스트 표시용 슬림 row */
export type CreativeListItem = {
  id: string;
  name: string;
  type: CreativeKind;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  duration: number | null;
  fileName: string | null;
  tags: string[];
  createdAt: string;
  /** Booking/Campaign 등에서 참조하는 횟수(요약) — 사용 이력 토글에 사용 */
  usageCount: number;
};

/** 라이브러리 상세 + 사용 이력 */
export type CreativeDetail = CreativeListItem & {
  usages: Array<{
    kind: "instant_booking" | "media_booking" | "campaign";
    id: string;
    title: string;
    href: string;
    status?: string;
    createdAt: string;
  }>;
  publicId: string | null;
  updatedAt: string;
};

export type PlaylistScheduleRule = {
  id: string;
  creativeId: string;
  /** 0=일 ... 6=토 */
  days: number[];
  /** "HH:MM" 24h. 둘 다 비면 종일 */
  startTime?: string;
  endTime?: string;
  note?: string;
};

export type PlaylistSchedule = {
  rules: PlaylistScheduleRule[];
};

export type PlaylistItemView = {
  id: string;
  creativeId: string;
  durationSec: number;
  order: number;
  creative: Pick<CreativeListItem, "id" | "name" | "type" | "url" | "thumbnailUrl" | "duration">;
};

export type PlaylistListItem = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  totalDurationSec: number;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistDetail = {
  id: string;
  name: string;
  description: string | null;
  schedule: PlaylistSchedule | null;
  items: PlaylistItemView[];
  createdAt: string;
  updatedAt: string;
};

export const DAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"];
export const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 0–6 정수 배열 검증 */
export function isValidDaysArray(v: unknown): v is number[] {
  if (!Array.isArray(v)) return false;
  return v.every((x) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6);
}

/** "HH:MM" 검증 */
export function isValidHHMM(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}
