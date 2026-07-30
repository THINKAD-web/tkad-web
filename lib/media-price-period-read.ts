/**
 * A1a — 읽기 경로 한글/숫자 기간 → canonical period 매핑.
 * 쓰기 경로(`media-price-period-write`)와 분리: 신규 입력은 enum만, 레거시는 읽기에서만 허용.
 */
import type { MediaPricePeriodKey } from "@/lib/media-data";

/** 스팟체크 후 A1a 2주 매핑 제외 — 수동 검증 후 개별 반영 */
export const A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA = [
  {
    id: "cmrep774v000304jrv9zmylys",
    nameFragment: "부산 해운대 엘리시아",
    fullName: "부산 해운대 엘리시아 호텔 외벽 광고",
  },
  {
    id: "cmrg5360d000104l7s0vllbeq",
    nameFragment: "강남 센타빌딩",
    fullName: "강남 센타빌딩 대형 외벽 아트월 광고",
  },
  {
    id: "cmrpvsn0k000p04l7ddhs9bwc",
    nameFragment: "HD한양주유소",
    fullName: "HD한양주유소 빌보드 광고",
  },
  {
    id: "cmo5yramn000504jul2h2i3y6",
    nameFragment: "시청 프레지던트호텔",
    fullName: "시청 프레지던트호텔 아트월 광고",
  },
  {
    id: "cmo61lsrg000204juraw6dpsw",
    nameFragment: "이태원역 178",
    fullName: "이태원역 178 외벽 아트월 광고",
  },
] as const;

export type MediaPricePeriodReadContext = {
  mediaId?: string | null;
  mediaName?: string | null;
};

const CANONICAL: ReadonlySet<string> = new Set([
  "month",
  "biweekly",
  "week",
  "day",
]);

const READ_DAY_PERIODS = new Set(["1일"]);
const READ_WEEK_PERIODS = new Set(["7일", "1주"]);
const READ_BIWEEKLY_PERIODS = new Set(["15일", "2주"]);
const READ_MONTH_ALIASES = new Set(["1개월", "월", "monthly"]);

const MANUAL_REVIEW_IDS = new Set(
  A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA.map((m) => m.id),
);

export function isA1aManualReviewBiweeklyMedia(
  ctx?: MediaPricePeriodReadContext,
): boolean {
  if (ctx?.mediaId && MANUAL_REVIEW_IDS.has(ctx.mediaId)) return true;
  const name = ctx?.mediaName?.trim();
  if (!name) return false;
  return A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA.some((m) =>
    name.includes(m.nameFragment),
  );
}

/** A1a에 포함되는 period raw 값 (A1b/A1c 제외) */
export function isA1aReadMappedPeriodRaw(raw: string): boolean {
  const t = raw.trim();
  return (
    READ_DAY_PERIODS.has(t) ||
    READ_WEEK_PERIODS.has(t) ||
    READ_BIWEEKLY_PERIODS.has(t) ||
    READ_MONTH_ALIASES.has(t.toLowerCase()) ||
    READ_MONTH_ALIASES.has(t)
  );
}

/**
 * 레거시 period → canonical (읽기 전용).
 * A1b/A1c(2개월·시즌·campaign 등)는 month 폴백 — 억지 enum 매핑 없음.
 */
export function normalizeMediaPricePeriodRead(
  v: string | undefined | null,
  ctx?: MediaPricePeriodReadContext,
): MediaPricePeriodKey {
  if (v === "biweekly" || v === "week" || v === "day" || v === "month") {
    return v;
  }

  const t = (v ?? "").trim();
  if (!t) return "month";

  if (READ_DAY_PERIODS.has(t)) return "day";
  if (READ_WEEK_PERIODS.has(t)) return "week";
  if (READ_BIWEEKLY_PERIODS.has(t)) {
    if (t === "2주" && isA1aManualReviewBiweeklyMedia(ctx)) {
      return "month";
    }
    return "biweekly";
  }

  const lower = t.toLowerCase();
  if (READ_MONTH_ALIASES.has(t) || READ_MONTH_ALIASES.has(lower)) {
    return "month";
  }

  return "month";
}

export function readContextFromMedia(
  media: { id?: string; name?: string } | null | undefined,
): MediaPricePeriodReadContext | undefined {
  if (!media?.id && !media?.name) return undefined;
  return { mediaId: media.id, mediaName: media.name };
}

/** A1b/A1c 리포트용 — enum·A1a 외 period 값 수집 */
export function collectNonA1aPricePeriods(
  items: ReadonlyArray<{
    id?: string;
    name?: string;
    pricePeriod?: string | null;
    priceOptions?: ReadonlyArray<{ period?: string | null }> | null;
  }>,
): Array<{ mediaId?: string; mediaName?: string; period: string; source: string }> {
  const rows: Array<{
    mediaId?: string;
    mediaName?: string;
    period: string;
    source: string;
  }> = [];

  for (const m of items) {
    const root = m.pricePeriod?.trim();
    if (
      root &&
      !CANONICAL.has(root) &&
      !isA1aReadMappedPeriodRaw(root)
    ) {
      rows.push({
        mediaId: m.id,
        mediaName: m.name,
        period: root,
        source: "pricePeriod",
      });
    }
    for (const opt of m.priceOptions ?? []) {
      const p = opt.period?.trim();
      if (!p || CANONICAL.has(p) || isA1aReadMappedPeriodRaw(p)) continue;
      rows.push({
        mediaId: m.id,
        mediaName: m.name,
        period: p,
        source: "priceOptions",
      });
    }
  }
  return rows;
}
