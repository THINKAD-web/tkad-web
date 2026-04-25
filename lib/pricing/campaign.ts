import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import {
  priceToDailyKrw,
  priceToWon,
  type PriceUnitHint,
} from "@/lib/pricing/unit";
import {
  selectDiscount,
  type DiscountTier,
} from "@/lib/pricing/discount-policy";
import {
  combinedMultiplier,
  type MultiplierContext,
} from "@/lib/pricing/multipliers";

/** 한국 부가세율. */
export const VAT_RATE = 0.1;
const MS_PER_DAY = 86_400_000;

/**
 * 시작·종료일(포함) 캠페인 일수.
 *
 * `lib/admin-quote-calc.ts:inclusiveCampaignDays` 와 동일 구현 — 후속 PR 에서
 * 어드민도 이 모듈로 이전 예정. 그 때 admin 쪽 사본을 제거한다.
 */
export function inclusiveCampaignDays(start: Date, end: Date): number {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

export type LineInput = {
  media: MediaItem;
  /** `media.priceOptions` 인덱스. undefined 면 default `media.price` 사용. */
  priceOptionIndex?: number;
  /** 네트워크 카탈로그 — 선택 사이트 수. undefined 면 `networkMinUnits`. */
  networkUnits?: number;
};

export type LineResult = {
  mediaId: string;
  /** 일 단가(원) — 할인·VAT 적용 전, multiplier 적용 전. */
  dailyKrw: number;
  /** dailyKrw × days × multiplier — 할인·VAT 적용 전. */
  lineKrw: number;
  source: "default" | "priceOption" | "network";
  /** UI/PDF 라벨용 추가 설명(예: "20초 기준" / "100개소"). */
  detail?: string;
};

function dailyKrwForLine(
  input: LineInput,
  hint: PriceUnitHint,
): { daily: number; source: LineResult["source"]; detail?: string } {
  const { media, priceOptionIndex, networkUnits } = input;

  if (media.catalogSource === "network") {
    const minUnits = media.networkMinUnits ?? 1;
    const units = Math.max(minUnits, networkUnits ?? minUnits);
    const monthlyRaw = computeNetworkMonthlyFromMediaItem(media, units);
    // 네트워크는 월 단위 가격이 단일 진실 — 원 정규화 후 30 으로 나눠 일 단가화.
    const daily = priceToWon(monthlyRaw, hint) / 30;
    return { daily, source: "network", detail: `${units}개소` };
  }

  const opts = media.priceOptions;
  if (priceOptionIndex != null && opts?.[priceOptionIndex]) {
    const opt = opts[priceOptionIndex];
    const period =
      ((opt.period as MediaPricePeriodKey | undefined) ??
        media.pricePeriod) ||
      "month";
    return {
      daily: priceToDailyKrw(opt.price, period, hint),
      source: "priceOption",
      detail: opt.label,
    };
  }

  return {
    daily: priceToDailyKrw(media.price, media.pricePeriod, hint),
    source: "default",
  };
}

/**
 * 단일 견적 라인 계산. 라운딩은 라인 단위에서만 적용해 합계 누적 오차를 최소화한다.
 */
export function computeLineKrw(
  input: LineInput,
  ctx: {
    days: number;
    multiplierCtx?: MultiplierContext;
    hint?: PriceUnitHint;
  },
): LineResult {
  const { daily, source, detail } = dailyKrwForLine(input, ctx.hint ?? "auto");
  const mul = ctx.multiplierCtx ? combinedMultiplier(ctx.multiplierCtx) : 1;
  const days = Math.max(0, Math.floor(ctx.days));
  return {
    mediaId: input.media.id,
    dailyKrw: Math.round(daily),
    lineKrw: Math.round(daily * days * mul),
    source,
    detail,
  };
}

export type QuoteTotals = {
  lines: LineResult[];
  /** 모든 라인 lineKrw 합 — 할인 전. */
  subtotalKrw: number;
  /** 적용된 할인(큰 쪽만). */
  discount: DiscountTier;
  /** subtotal × (1 − discount.rate). */
  discountedKrw: number;
  /** discountedKrw × VAT_RATE. */
  vatKrw: number;
  /** discountedKrw + vatKrw. */
  totalKrw: number;
  /** totalKrw / days. days = 0 이면 0. */
  perDayKrw: number;
  /** inclusiveCampaignDays(start, end). */
  days: number;
};

/**
 * 견적 전체 계산 — Planner / 견적 마법사 / PDF / 어드민 모두 이 함수를 통해 동일한 합계를 얻는다.
 */
export function computeQuoteTotals(input: {
  lines: LineInput[];
  start: Date;
  end: Date;
  /** time-slot / season 가중치 컨텍스트. start/end 는 자동 주입되므로 생략 가능. */
  multiplierCtx?: Omit<MultiplierContext, "start" | "end">;
  hint?: PriceUnitHint;
}): QuoteTotals {
  const days = inclusiveCampaignDays(input.start, input.end);
  const lines = input.lines.map((l) =>
    computeLineKrw(l, {
      days,
      multiplierCtx: input.multiplierCtx
        ? {
            ...input.multiplierCtx,
            start: input.start,
            end: input.end,
            mediaType: l.media.type,
          }
        : undefined,
      hint: input.hint,
    }),
  );
  const subtotalKrw = lines.reduce((s, l) => s + l.lineKrw, 0);
  const discount = selectDiscount({ days, mediaCount: input.lines.length });
  const discountedKrw = Math.round(subtotalKrw * (1 - discount.rate));
  const vatKrw = Math.round(discountedKrw * VAT_RATE);
  const totalKrw = discountedKrw + vatKrw;
  const perDayKrw = days > 0 ? Math.round(totalKrw / days) : 0;
  return {
    lines,
    subtotalKrw,
    discount,
    discountedKrw,
    vatKrw,
    totalKrw,
    perDayKrw,
    days,
  };
}
