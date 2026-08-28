"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Share2, Sparkles } from "lucide-react";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import type { MediaItem } from "@/lib/media-data";
import {
  findCheapestPriceOptionIndex,
  pricePeriodDays,
  resolvePriceOptionBundleDays,
} from "@/lib/compare-quote";
import { formatMediaCostEstimateShort } from "@/lib/media-display-currency";
import { rememberQuoteEntryPriceOption } from "@/lib/quote-wizard-entry";
import {
  inferQuoteCampaignPeriodFromMedia,
} from "@/lib/quote-wizard-pricing";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { MediaDetailProposalCard } from "@/components/media-detail/media-detail-proposal-card";
import {
  formatCatalogPriceFieldWon,
  normalizeMediaPricePeriod,
  resolveMediaPriceOptionPeriodLabel,
} from "@/lib/media-price-format";
import {
  buildMediaDetailPlannerHref,
  buildMediaDetailQuoteHref,
  calculateMediaDetailQuote,
  flightDatesToCampaignDays,
  shouldShowMediaDetailQuantityControl,
} from "@/lib/media-detail-quantity";
import {
  getQuantityUnitMode,
  isPerUnitGradePriceOptions,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { resolveQuoteUnitsForPriceOption } from "@/lib/quote-entry-quantity";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  pageLocale: string;
  displayName: string;
  periodLabel: string;
  className?: string;
};

export function MediaDetailStickyQuotePanel({
  media,
  isKo,
  pageLocale,
  displayName,
  periodLabel,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const localeTag = isKo ? "ko" : "en";
  const priceOptions = media.priceOptions ?? [];
  const hasPriceOptions = priceOptions.length > 0;
  const showQuantity = shouldShowMediaDetailQuantityControl(media);
  const packageMode = getQuantityUnitMode(media) === "package";

  const defaultOptIdx = useMemo(
    () => findCheapestPriceOptionIndex(media),
    [media],
  );
  const [optIdx, setOptIdx] = useState(defaultOptIdx);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceOptionIndex, setPriceOptionIndex] = useState<Record<string, number>>(
    {},
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setOptIdx(findCheapestPriceOptionIndex(media));
    setQuantities({});
    setPriceOptionIndex({});
  }, [media.id, media]);

  const safeOptIdx = hasPriceOptions
    ? Math.min(Math.max(0, optIdx), priceOptions.length - 1)
    : 0;

  useEffect(() => {
    if (hasPriceOptions && !packageMode) {
      rememberQuoteEntryPriceOption(media.id, safeOptIdx);
    }
  }, [media.id, hasPriceOptions, packageMode, safeOptIdx]);

  useEffect(() => {
    if (packageMode && hasPriceOptions) {
      setPriceOptionIndex((prev) => ({
        ...prev,
        [media.id]: safeOptIdx,
      }));
    }
  }, [media.id, packageMode, hasPriceOptions, safeOptIdx]);

  const effectivePoIdx = packageMode
    ? (priceOptionIndex[media.id] ?? safeOptIdx)
    : safeOptIdx;

  const selectedOption = hasPriceOptions
    ? priceOptions[effectivePoIdx]
    : undefined;

  const units = resolveMediaQuantity(media, quantities[media.id]);

  const optionBundleDays = useMemo(() => {
    if (!selectedOption) {
      return pricePeriodDays(normalizeMediaPricePeriod(media.pricePeriod));
    }
    return resolvePriceOptionBundleDays(selectedOption, media.pricePeriod);
  }, [selectedOption, media.pricePeriod]);

  const days = useMemo(() => {
    const fromFlight = flightDatesToCampaignDays(startDate, endDate);
    if (fromFlight != null) return fromFlight;
    return hasPriceOptions ? optionBundleDays : 30;
  }, [startDate, endDate, hasPriceOptions, optionBundleDays]);

  const flightCampaignDays = useMemo(
    () => flightDatesToCampaignDays(startDate, endDate),
    [startDate, endDate],
  );

  const quote = useMemo(
    () =>
      calculateMediaDetailQuote(media, days, {
        units,
        priceOptionIndex: effectivePoIdx,
      }),
    [media, days, units, effectivePoIdx],
  );

  const monthlyImpressions = useMemo(() => {
    if (packageMode && hasPriceOptions) {
      return resolveImpressionsForUnits(media, 1);
    }
    return resolveImpressionsForUnits(media, units);
  }, [media, units, packageMode, hasPriceOptions]);

  const headlinePrice = hasPriceOptions && selectedOption
    ? formatCatalogPriceFieldWon(selectedOption.price, locale, media.country)
    : formatCatalogPriceFieldWon(media.price, locale, media.country);

  const headlinePeriod = hasPriceOptions && selectedOption
    ? resolveMediaPriceOptionPeriodLabel(
        selectedOption,
        media.pricePeriod,
        localeTag,
      ) ?? periodLabel
    : periodLabel;

  const quoteHref = useMemo(
    () =>
      buildMediaDetailQuoteHref(media, {
        priceOptionIndex: effectivePoIdx,
        units,
        period: inferQuoteCampaignPeriodFromMedia(media, effectivePoIdx),
        campaignDays: flightCampaignDays ?? undefined,
        flightStart: flightCampaignDays != null ? startDate : undefined,
        flightEnd: flightCampaignDays != null ? endDate : undefined,
      }),
    [media, effectivePoIdx, units, flightCampaignDays, startDate, endDate],
  );

  const plannerHref = useMemo(
    () => buildMediaDetailPlannerHref(media.id, units),
    [media.id, units],
  );

  const inputCls =
    "h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900 outline-none focus:border-[color:var(--qp-accent)]/50 focus:ring-2 focus:ring-[color:var(--qp-accent)]/20";

  return (
    <aside
      className={cn(
        "w-full max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5 shadow-lg",
        className,
      )}
    >
      <p className="truncate text-[length:var(--qp-text-body)] font-bold dark:text-white text-gray-900">
        {displayName}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--qp-accent)]">
        {headlinePrice}
      </p>
      <p className="text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
        {headlinePeriod}
      </p>
      <MediaPriceExclNote isKo={isKo} className="mt-0.5" />

      {showQuantity ? (
        <div className="mt-3">
          <PlannerMediaQuantityControl
            media={media}
            isKo={isKo}
            quantities={quantities}
            priceOptionIndex={priceOptionIndex}
            compact
            onQuantityChange={(n) =>
              setQuantities((prev) => ({ ...prev, [media.id]: n }))
            }
            onPriceOptionChange={(i) => {
              setOptIdx(i);
              setPriceOptionIndex((prev) => ({ ...prev, [media.id]: i }));
              rememberQuoteEntryPriceOption(media.id, i);
              if (isPerUnitGradePriceOptions(media)) {
                setQuantities((prev) => ({
                  ...prev,
                  [media.id]: resolveQuoteUnitsForPriceOption(media, i),
                }));
              }
            }}
          />
        </div>
      ) : hasPriceOptions && !packageMode ? (
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="sticky-quote-price-option"
            className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70"
          >
            {isKo ? "가격 옵션" : "Price option"}
          </label>
          <select
            id="sticky-quote-price-option"
            value={safeOptIdx}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              const idx = Number.isFinite(v) ? v : 0;
              setOptIdx(idx);
              rememberQuoteEntryPriceOption(media.id, idx);
              if (isPerUnitGradePriceOptions(media)) {
                setQuantities((prev) => ({
                  ...prev,
                  [media.id]: resolveQuoteUnitsForPriceOption(media, idx),
                }));
              }
            }}
            className={inputCls}
          >
            {priceOptions.map((o, i) => (
              <option key={`${o.label}-${i}`} value={i}>
                {o.label} — {formatCatalogPriceFieldWon(o.price, locale, media.country)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-5 space-y-3 border-t dark:border-white/10 border-gray-100 pt-5">
        <p className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
          {isKo ? "집행 기간" : "Flight dates"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
              {isKo ? "시작" : "Start"}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
              {isKo ? "종료" : "End"}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <div className="rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3 text-[length:var(--qp-text-body)]">
          <p className="flex justify-between gap-2 dark:text-white/80 text-gray-700">
            <span>{isKo ? "예상 비용" : "Est. cost"}</span>
            <span className="font-bold tabular-nums dark:text-white text-gray-900">
              {formatMediaCostEstimateShort(
                quote.costWon,
                media.country,
                locale,
              )}
            </span>
          </p>
          {monthlyImpressions > 0 ? (
            <p className="mt-1 flex justify-between gap-2 dark:text-white/60 text-gray-500">
              <span>{isKo ? "월 예상 노출" : "Est. monthly reach"}</span>
              <span className="tabular-nums">
                {monthlyImpressions.toLocaleString(locale)}
                {isKo ? "회" : ""}
              </span>
            </p>
          ) : quote.impressions > 0 ? (
            <p className="mt-1 flex justify-between gap-2 dark:text-white/60 text-gray-500">
              <span>{isKo ? "예상 노출" : "Est. impressions"}</span>
              <span className="tabular-nums">
                {quote.impressions.toLocaleString(locale)}
                {isKo ? "회" : ""}
              </span>
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Link
            href={quoteHref}
            data-accent-keep="true"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[color:var(--qp-accent)] px-3 text-center text-sm font-bold text-white"
          >
            {isKo ? "견적 받기" : "Get quote"}
          </Link>

          <details className="group rounded-xl border border-gray-100 dark:border-white/10">
            <summary className="cursor-pointer list-none px-3 py-2 text-center text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/65 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                {isKo ? "담기 · 플래너 · 공유" : "Save · Planner · Share"}
                <span className="transition group-open:rotate-180">▾</span>
              </span>
            </summary>
            <div className="space-y-2 border-t border-gray-100 px-2 pb-3 pt-2 dark:border-white/10">
              <PlanCartAddButton
                item={planCartItemFromMediaItem(media, "search")}
                addedFrom="search"
                compact
                mediaDetailLabel
                className="w-full"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={plannerHref}
                  className="inline-flex h-8 flex-1 min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border border-[color:var(--qp-accent)]/25 bg-[color:var(--qp-accent)]/8 px-2 text-[10px] font-semibold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]"
                >
                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                  {isKo ? "플래너" : "Planner"}
                </Link>
                <MediaDetailProposalCard
                  media={media}
                  isKo={isKo}
                  locale={pageLocale}
                  variant="inline"
                  compactSecondary
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.share) {
                      void navigator.share({
                        title: displayName,
                        url: window.location.href,
                      });
                    } else {
                      void navigator.clipboard?.writeText(window.location.href);
                    }
                  }}
                  className="inline-flex h-8 flex-1 min-w-[3.5rem] items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-[10px] font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/6 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <Share2 className="h-3 w-3 shrink-0" aria-hidden />
                  {isKo ? "공유" : "Share"}
                </button>
                <MediaFavoriteButton
                  mediaId={media.id}
                  mediaName={media.name}
                  mediaNameEn={media.nameEn}
                  compact
                  className="!h-8 shrink-0"
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}
