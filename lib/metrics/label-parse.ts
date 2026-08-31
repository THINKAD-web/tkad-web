/**
 * priceOption 라벨에서 결제 기간 일수 파싱.
 * 재생 빈도 "(1일 N회)" 와 결제 주기를 구분한다.
 */

/** 재생 빈도 "(1일 100회)" / "1일 20초 100회" — 판매 기간 1일이 아님 */
const FREQUENCY_LABEL_RE = /\d+\s*일\s*\d+\s*회/;
const FREQUENCY_LABEL_PREFIX_RE = /^\d+\s*일\s+.*\d+\s*회/;

export function isFrequencyPlaybackLabel(label: string): boolean {
  return (
    FREQUENCY_LABEL_RE.test(label) || FREQUENCY_LABEL_PREFIX_RE.test(label)
  );
}

/**
 * priceOption 라벨에 명시된 일수 (예: "7일", "1개월", "2주").
 * "1일 100회" 재생 빈도 표기는 null (결제 주기 아님).
 */
export function parseLabelDays(label: string | null | undefined): number | null {
  if (!label) return null;
  const t = label.trim();
  // relabel "1개월 · …" — 재생 빈도 "(1일 N회)" 보다 결제 주기 우선
  const month = t.match(/(\d+)\s*개월/);
  if (month) return Math.max(1, Number.parseInt(month[1]!, 10)) * 30;
  if (isFrequencyPlaybackLabel(label)) return null;
  const week = t.match(/(\d+)\s*주/);
  if (week) return Math.max(1, Number.parseInt(week[1]!, 10)) * 7;
  const day = t.match(/(\d+)\s*일/);
  if (day) return Math.max(1, Number.parseInt(day[1]!, 10));
  if (/\b1\s*week\b/i.test(t)) return 7;
  return null;
}

/** @deprecated alias — parseLabelDays 와 동일 (빈도 구분 포함) */
export function parseBillingPeriodDays(
  label: string | null | undefined,
): number | null {
  return parseLabelDays(label);
}
