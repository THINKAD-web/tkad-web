/**
 * Admin 견적 빌더 전용 청구 모드·날짜 헬퍼.
 * 공개 견적 위저드와 분리 — `monthFactorFromDays` 전역 의미는 변경하지 않는다.
 */

import {
  PARTIAL_PERIOD_RATE_DAYS,
  PARTIAL_PERIOD_RATE_KEYS,
  type PartialPeriodRateAdminKey,
} from "@/lib/media-partial-period-rates";

/** 개월 단위 / 일 프리셋 / 자유 날짜 */
export type AdminQuoteBillingMode =
  | "calendar_months"
  | "day_preset"
  | "custom_dates";

export type AdminQuoteBillingContext = {
  mode: AdminQuoteBillingMode;
  /** calendar_months — 온전한 N개월 (일수 무시, 단가×N) */
  calendarMonths: number;
  /** day_preset — 운영 부분기간 키에 대응하는 일수 */
  presetDays: number;
  /** 현재 선택 구간의 inclusive 일수 (표시·custom/fallback용) */
  days: number;
  startDate: string;
  endDate: string;
};

export function addCalendarMonthsISO(iso: string, months: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y!, mo! - 1 + months, da!);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y!, mo! - 1, da! + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 온전한 N개월 inclusive 종료일 = start + N개월 − 1일 */
export function endDateForCalendarMonths(
  startISO: string,
  months: number,
): string {
  const n = Math.max(1, Math.round(months));
  return addDaysISO(addCalendarMonthsISO(startISO, n), -1);
}

/** 일수 프리셋 inclusive 종료일 = start + days − 1 */
export function endDateForDayPreset(startISO: string, days: number): string {
  const d = Math.max(1, Math.round(days));
  return addDaysISO(startISO, d - 1);
}

export function inclusiveDaysISO(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function syncBillingEndDate(
  ctx: Pick<
    AdminQuoteBillingContext,
    "mode" | "calendarMonths" | "presetDays" | "startDate" | "endDate"
  >,
): Pick<AdminQuoteBillingContext, "endDate" | "days"> {
  if (ctx.mode === "calendar_months") {
    const endDate = endDateForCalendarMonths(
      ctx.startDate,
      ctx.calendarMonths,
    );
    return {
      endDate,
      days: inclusiveDaysISO(ctx.startDate, endDate),
    };
  }
  if (ctx.mode === "day_preset") {
    const endDate = endDateForDayPreset(ctx.startDate, ctx.presetDays);
    return {
      endDate,
      days: inclusiveDaysISO(ctx.startDate, endDate),
    };
  }
  return {
    endDate: ctx.endDate,
    days: inclusiveDaysISO(ctx.startDate, ctx.endDate),
  };
}

export function defaultAdminQuoteBillingDates(startDate: string): {
  endDate: string;
  days: number;
  calendarMonths: number;
} {
  const calendarMonths = 1;
  const endDate = endDateForCalendarMonths(startDate, calendarMonths);
  return {
    calendarMonths,
    endDate,
    days: inclusiveDaysISO(startDate, endDate),
  };
}

/** start~end 가 온전한 N개월이면 N, 아니면 null */
export function inferCalendarMonthsFromRange(
  startISO: string,
  endISO: string,
  maxMonths = 36,
): number | null {
  const max = Math.max(1, Math.min(36, Math.round(maxMonths)));
  for (let n = 1; n <= max; n++) {
    if (endDateForCalendarMonths(startISO, n) === endISO) return n;
  }
  return null;
}

export const ADMIN_DAY_PRESET_OPTIONS: {
  key: PartialPeriodRateAdminKey;
  days: number;
  labelKo: string;
}[] = PARTIAL_PERIOD_RATE_KEYS.map((key) => ({
  key,
  days: PARTIAL_PERIOD_RATE_DAYS[key],
  labelKo:
    key === "1day"
      ? "1일"
      : key === "3days"
        ? "3일"
        : key === "5days"
          ? "5일"
          : key === "7days"
            ? "7일"
            : key === "15days"
              ? "15일"
              : "30일",
}));
