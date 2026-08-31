/**
 * R-03 — engine 경로(`mediaPriceOptions`) 기준 기간 환산 감사.
 *
 * 등록 tier 할인(2주/1개월)은 선형 환산 괴리만으로 위반 처리하지 않는다.
 */
import {
  isBaseOnlyPriceMedia,
  isRiskyBaseOnlyPricePeriod,
  mediaPriceOptions,
  type MediaPriceSource,
} from "./media-price-adapter";
import { linearMonthlyDeviation, normalizePriceOptions } from "./price";
import { readPriceOptions, type PriceOptionsRow } from "./read-price-options";
import type { PriceOption } from "./types";

export type R03AuditResult = {
  violation: boolean;
  deviation?: number;
  proxy?: string;
};

function minPerDayByTier(
  options: readonly PriceOption[],
): Array<{ days: number; perDay: number }> {
  const byDays = new Map<number, number>();
  for (const o of options) {
    const rate = o.price / Math.max(1, o.days);
    const prev = byDays.get(o.days);
    if (prev == null || rate < prev) byDays.set(o.days, rate);
  }
  return [...byDays.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([days, perDay]) => ({ days, perDay }));
}

/** 장기일수록 일할 단가가 같거나 낮아지는 tier ladder (동일 일수 패키지 변형은 1 tier) */
function hasMonotonicTierDiscount(options: readonly PriceOption[]): boolean {
  const tiers = minPerDayByTier(options);
  if (tiers.length < 2) return false;
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i]!.perDay > tiers[i - 1]!.perDay * 1.02) return false;
  }
  return true;
}

/** 시즌별 월상품 — 라벨에 명시적 시즌/월 범위가 있을 때만 */
function hasSeasonalSameBucket(options: readonly PriceOption[]): boolean {
  const byDays = new Map<number, PriceOption[]>();
  for (const o of options) {
    if (o.days < 28) continue;
    const list = byDays.get(o.days) ?? [];
    list.push(o);
    byDays.set(o.days, list);
  }
  const seasonRe =
    /\d+\s*[~\-]\s*\d+\s*월|시즌|성수기|비수기|11\s*[~\-]\s*12|1\s*[~\-]\s*10/i;
  for (const opts of byDays.values()) {
    if (opts.length < 2) continue;
    const prices = new Set(opts.map((o) => o.price));
    if (prices.size < 2) continue;
    const labels = opts.map((o) => o.label ?? "").join(" ");
    if (seasonRe.test(labels)) return true;
  }
  return false;
}

export function evaluateR03PeriodConversion(
  row: MediaPriceSource & PriceOptionsRow,
): R03AuditResult {
  const engineOpts = normalizePriceOptions(mediaPriceOptions(row));

  if (engineOpts.length === 0) {
    return { violation: false };
  }

  if (isBaseOnlyPriceMedia(row) && isRiskyBaseOnlyPricePeriod(row)) {
    return {
      violation: true,
      proxy: "base_only_risky",
    };
  }

  if (isBaseOnlyPriceMedia(row)) {
    return { violation: false };
  }

  if (engineOpts.length >= 2) {
    const hasDayTier = engineOpts.some((o) => o.days === 1);
    const hasPackageTier = engineOpts.some((o) => o.days >= 7);

    if (hasDayTier && hasPackageTier) {
      const dev = linearMonthlyDeviation(engineOpts);
      return {
        violation: true,
        deviation: dev ?? undefined,
        proxy: "day_tier_with_package",
      };
    }

    if (hasSeasonalSameBucket(engineOpts)) {
      const dev = linearMonthlyDeviation(engineOpts);
      return {
        violation: true,
        deviation: dev ?? undefined,
        proxy: "seasonal_same_bucket",
      };
    }

    if (
      hasMonotonicTierDiscount(engineOpts) &&
      minPerDayByTier(engineOpts).every((t) => t.days >= 7)
    ) {
      return { violation: false, proxy: "tier_discount_ok" };
    }

    const distinctTiers = minPerDayByTier(engineOpts);
    if (distinctTiers.length >= 2 && !hasMonotonicTierDiscount(engineOpts)) {
      const dev = linearMonthlyDeviation(engineOpts);
      return {
        violation: true,
        deviation: dev ?? undefined,
        proxy: "inverted_tier_discount",
      };
    }
  }

  const auditDev = linearMonthlyDeviation(readPriceOptions(row));
  const engineDev = linearMonthlyDeviation(engineOpts);

  if (
    auditDev != null &&
    Math.abs(auditDev) > 0.1 &&
    (engineDev == null || Math.abs(engineDev) <= 0.1)
  ) {
    return { violation: false, proxy: "phantom_base_only" };
  }

  const dev = engineDev ?? auditDev;
  if (dev != null && Math.abs(dev) > 0.1) {
    return { violation: true, deviation: dev, proxy: "linear_deviation" };
  }

  return { violation: false };
}
