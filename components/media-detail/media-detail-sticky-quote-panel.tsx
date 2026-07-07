"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Share2, Sparkles } from "lucide-react";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaDetailAddToCart } from "@/components/media-detail-add-to-cart";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import type { MediaItem } from "@/lib/media-data";
import {
  findCheapestPriceOptionIndex,
  formatWonShort,
  pricePeriodDays,
  resolvePriceOptionBundleDays,
} from "@/lib/compare-quote";
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
  shouldShowMediaDetailQuantityControl,
} from "@/lib/media-detail-quantity";
import {
  getQuantityUnitMode,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
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
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
      if (Number.isFinite(diff) && diff > 0) return diff;
    }
    return hasPriceOptions ? optionBundleDays : 30;
  }, [startDate, endDate, hasPriceOptions, optionBundleDays]);

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
    ? formatCatalogPriceFieldWon(selectedOption.price, locale)
    : formatCatalogPriceFieldWon(media.price, locale);

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
      }),
    [media, effectivePoIdx, units],
  );

  const plannerHref = useMemo(
    () => buildMediaDetailPlannerHref(media.id, units),
    [media.id, units],
  );

  const inputCls =
    "h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20";

  return (
    <aside
      className={cn(
        "w-full max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5 shadow-lg",
        className,
      )}
    >
      <p className="truncate text-base font-bold dark:text-white text-gray-900">
        {displayName}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums dark:text-white text-gray-900">
        {headlinePrice}
      </p>
      <p className="text-[11px] dark:text-white/45 text-gray-500">
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
            }}
          />
        </div>
      ) : hasPriceOptions && !packageMode ? (
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="sticky-quote-price-option"
            className="text-[10px] font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400"
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
            }}
            className={inputCls}
          >
            {priceOptions.map((o, i) => (
              <option key={`${o.label}-${i}`} value={i}>
                {o.label} — {formatCatalogPriceFieldWon(o.price, locale)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-5 space-y-3 border-t dark:border-white/10 border-gray-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
          {isKo ? "집행 기간" : "Flight dates"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] dark:text-white/40 text-gray-400">
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
            <span className="text-[10px] dark:text-white/40 text-gray-400">
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

        <div className="rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3 text-sm">
          <p className="flex justify-between gap-2 dark:text-white/80 text-gray-700">
            <span>{isKo ? "예상 비용" : "Est. cost"}</span>
            <span className="font-bold tabular-nums dark:text-white text-gray-900">
              {formatWonShort(quote.costWon, isKo ? "ko" : "en")}
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
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={quoteHref}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-3 text-center text-sm font-bold text-gray-900 dark:text-white"
            >
              {isKo ? "견적 받기" : "Get quote"}
            </Link>
            <Link
              href={plannerHref}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 text-center text-sm font-bold text-violet-800 dark:text-violet-100"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "플래너" : "Planner"}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MediaInquiryDialog
              mediaId={media.id}
              mediaName={displayName}
              triggerLabel={isKo ? "전문가 문의" : "Ask expert"}
              compact
              className="w-full border-gray-200 bg-gray-100 text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90"
            />
            <MediaDetailAddToCart
              mediaId={media.id}
              mediaName={displayName}
              compact
            />
            <PlanCartAddButton
              item={planCartItemFromMediaItem(media, "search")}
              addedFrom="search"
              compact
              className="col-span-2 w-full"
            />
          </div>

          <MediaDetailProposalCard
            media={media}
            isKo={isKo}
            locale={pageLocale}
            variant="inline"
          />

          <div className="flex items-center justify-between gap-2 border-t dark:border-white/10 border-gray-100 pt-3">
            <MediaFavoriteButton
              mediaId={media.id}
              mediaName={media.name}
              mediaNameEn={media.nameEn}
              compact
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
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/12 dark:bg-white/8 dark:text-white/85 dark:hover:bg-white/12"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {isKo ? "공유" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
