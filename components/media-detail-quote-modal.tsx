"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/modal";
import { Calculator, Check, MessageCircle, Sparkles } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  formatCatalogPriceKrwLong,
  mediaDetailPricePeriodTranslationKey,
  resolveMediaPriceOptionPeriodLabel,
} from "@/lib/media-price-format";
import {
  inferQuoteCampaignPeriodFromMedia,
} from "@/lib/quote-wizard-pricing";
import { resolveQuoteEntryPriceOptionIndex } from "@/lib/quote-wizard-entry";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import {
  buildMediaDetailPlannerHref,
  buildMediaDetailQuoteHref,
  shouldShowMediaDetailQuantityControl,
} from "@/lib/media-detail-quantity";
import { resolveMediaQuantity } from "@/lib/media-quantity";
import { resolveQuoteUnitsForPriceOption } from "@/lib/quote-entry-quantity";
import { isOnlineCatalogMedia, hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { onlinePricingLabel } from "@/lib/pricing/online-performance-estimate";
import { OnlineMediaBudgetFields, defaultOnlineBudgetWon } from "@/components/media/online-media-budget-fields";
import { cn } from "@/lib/utils";

function MediaDetailQuoteModalBody({
  media,
  onClose,
}: {
  media: MediaItem;
  onClose: () => void;
}) {
  const t = useTranslations("media.detail");
  const locale = useLocale();
  const isKo = locale === "ko";
  const mediaTitle = isKo ? media.name : (media.nameEn || media.name);

  const opts = media.priceOptions ?? [];
  const hasOpts = opts.length > 0;
  const showQuantity = shouldShowMediaDetailQuantityControl(media);
  const [optIdx, setOptIdx] = useState(() =>
    resolveQuoteEntryPriceOptionIndex(media),
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceOptionIndex, setPriceOptionIndex] = useState<
    Record<string, number>
  >({});

  const safeIdx = hasOpts
    ? Math.min(Math.max(0, optIdx), opts.length - 1)
    : 0;
  const effectivePoIdx = priceOptionIndex[media.id] ?? safeIdx;
  const units = resolveMediaQuantity(media, quantities[media.id]);

  const quoteHref = useMemo(() => {
    return buildMediaDetailQuoteHref(media, {
      priceOptionIndex: effectivePoIdx,
      units,
      period: inferQuoteCampaignPeriodFromMedia(media, effectivePoIdx),
    });
  }, [media, effectivePoIdx, units]);

  const plannerHref = useMemo(
    () => buildMediaDetailPlannerHref(media.id, units),
    [media.id, units],
  );

  const contactHref = useMemo(() => {
    const q = `/contact?media=${encodeURIComponent(media.id)}`;
    if (!hasOpts) return q;
    return `${q}&po=${effectivePoIdx}`;
  }, [media.id, hasOpts, effectivePoIdx]);

  const selected = hasOpts ? opts[effectivePoIdx] : undefined;

  const isOnline = isOnlineCatalogMedia(media);
  const [onlineBudgetWon, setOnlineBudgetWon] = useState(() =>
    defaultOnlineBudgetWon(media),
  );
  const onlineCalculable = isOnline && hasOnlinePricingSpec(media);
  const onlineHeadline =
    onlineCalculable && media.onlineSpec
      ? onlinePricingLabel(media.onlineSpec)
      : isKo
        ? "가격 문의"
        : "Price inquiry";

  const btnBlockBase =
    "inline-flex w-full items-center justify-center gap-2 border-2 font-display font-bold uppercase tracking-[0.18em] transition-colors duration-150";
  const primaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12 sm:h-14",
    "rounded-[22px] border dark:border-white/14 border-gray-200 bg-[color:var(--qp-accent)] text-white shadow-sm transition hover:bg-[color:var(--qp-accent-hover)] touch-manipulation",
  );
  const secondaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12",
    "rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-ui hover:-translate-y-0.5 hover:bg-white/12 touch-manipulation",
  );

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">

      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-9 pb-4 sm:px-6 sm:pt-10">
        <div className="mb-4 flex items-start gap-3 border-b dark:border-white/10 border-gray-200 pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="media-quote-modal-title"
              className="tkad-type-label dark:text-white text-gray-600"
            >
              [ {t("quoteModalTitle")} ]
            </h2>
            <p className="mt-1.5 text-base font-black leading-snug dark:text-white text-gray-900 sm:text-lg">
              {mediaTitle}
            </p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed dark:text-white text-gray-700">
          {isOnline
            ? isKo
              ? "온라인 매체는 문의 또는 MY PLAN 담기로 견적을 이어갈 수 있습니다."
              : "For online media, continue via contact or MY PLAN."
            : t("quoteModalDescription")}
        </p>

        {isOnline ? (
          <div className="mb-5 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-3 py-3 dark:text-white text-gray-900 backdrop-blur">
            <p className="text-lg font-black leading-snug text-[color:var(--qp-accent)]">
              {onlineHeadline}
            </p>
            {onlineCalculable ? (
              <div className="mt-3">
                <OnlineMediaBudgetFields
                  media={media}
                  budgetWon={onlineBudgetWon}
                  onBudgetChange={setOnlineBudgetWon}
                  isKo={isKo}
                  inputCls="h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {!isOnline && showQuantity ? (
          <div className="mb-4">
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
                setQuantities((prev) => ({
                  ...prev,
                  [media.id]: resolveQuoteUnitsForPriceOption(media, i, prev[media.id]),
                }));
              }}
            />
          </div>
        ) : null}

        {!isOnline && hasOpts && !showQuantity ? (
          <div
            className="mb-2 rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur sm:p-4"
            role="radiogroup"
            aria-label={t("quoteModalPriceOptionLabel")}
          >
            <p className="mb-2 tkad-type-label dark:text-white text-gray-500">
              [ {t("quoteModalPriceOptionLabel")} ]
            </p>
            <div className="flex flex-col gap-2">
            {opts.map((o, i) => {
              const selectedCard = safeIdx === i;
              const periodLabel = resolveMediaPriceOptionPeriodLabel(
                o,
                media.pricePeriod,
                locale,
              );
              return (
                <button
                  key={`${o.label}-${i}`}
                  type="button"
                  role="radio"
                  aria-checked={selectedCard}
                  onClick={() => {
                setOptIdx(i);
                setPriceOptionIndex((prev) => ({ ...prev, [media.id]: i }));
                setQuantities((prev) => ({
                  ...prev,
                  [media.id]: resolveQuoteUnitsForPriceOption(media, i, prev[media.id]),
                }));
              }}
                  className={cn(
                    "relative w-full rounded-[22px] border p-3 text-left transition-ui sm:p-3.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/18 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    selectedCard
                      ? "border-white/22 dark:bg-white/10 bg-gray-100"
                      : "dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 hover:border-white/16 hover:dark:bg-black bg-white/25",
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-xl border tkad-type-note font-black",
                      selectedCard
                        ? "dark:border-white/18 border-gray-300 bg-[color:var(--qp-accent)] text-white"
                        : "dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-2.5 stroke-[4]" />
                  </span>
                  <span className="block pr-10 text-sm font-black leading-snug dark:text-white text-gray-900">
                    {o.label}
                  </span>
                  <span className="mt-1.5 block text-lg font-black tabular-nums tracking-tight dark:text-white text-gray-900 sm:text-xl">
                    {formatCatalogPriceKrwLong(o.price, locale)}
                  </span>
                  {periodLabel ? (
                    <span className="mt-1.5 tkad-type-label dark:text-white text-gray-500">
                      {periodLabel}
                    </span>
                  ) : null}
                  {o.description?.trim() ? (
                    <span className="mt-2 block border-t dark:border-white/10 border-gray-200 pt-2 tkad-type-caption leading-relaxed dark:text-white text-gray-600">
                      {o.description}
                    </span>
                  ) : null}
                  {o.stores?.trim() ? (
                    <details className="mt-2 border-t dark:border-white/10 border-gray-200 pt-2">
                      <summary className="cursor-pointer list-none tkad-type-caption font-semibold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/90 [&::-webkit-details-marker]:hidden">
                        {isKo ? "포함 지점 보기" : "View locations"}
                      </summary>
                      <span className="mt-1.5 block tkad-type-caption leading-relaxed dark:text-white/70 text-gray-600">
                        {o.stores}
                      </span>
                    </details>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selected ? (
            <p className="mt-3 border-t dark:border-white/10 border-gray-200 pt-3 text-sm dark:text-white text-gray-700">
              <span className="tkad-type-label dark:text-white text-gray-500">
                {t("quoteModalSelectedPriceLine")}{" "}
              </span>
              <span className="font-black dark:text-white text-gray-900">
                {selected.label} ·{" "}
                {formatCatalogPriceKrwLong(selected.price, locale)}
              </span>
            </p>
          ) : null}
        </div>
      ) : !isOnline && media.keywordFilter?.priceText ? (
        <p className="mb-5 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-3 py-2.5 text-sm font-semibold dark:text-white text-gray-800 backdrop-blur">
          {media.keywordFilter.priceText}
        </p>
      ) : !isOnline ? (
        <div className="mb-5 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-3 py-3 dark:text-white text-gray-900 backdrop-blur">
          <p className="tkad-type-label dark:text-white text-gray-500">
            {isKo ? "기준 요금" : "Base rate"}
          </p>
          <p className="mt-1.5 text-lg font-black tabular-nums dark:text-white text-gray-900">
            {formatCatalogPriceKrwLong(media.price, locale)}
          </p>
          <p className="mt-0.5 tkad-type-note dark:text-white text-gray-500">
            {t(
              mediaDetailPricePeriodTranslationKey(media.pricePeriod),
            )}
          </p>
        </div>
      ) : null}

      </div>

      <div className="relative z-10 shrink-0 border-t dark:border-white/10 border-gray-200 bg-black/40 px-4 py-3 backdrop-blur-md dark:bg-black/55 sm:px-6 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {isOnline ? (
            <Link
              href={contactHref}
              onClick={onClose}
              className={primaryLinkClass}
            >
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
              {isKo ? "문의하기" : "Contact us"}
            </Link>
          ) : (
            <>
              <Link
                href={quoteHref}
                onClick={onClose}
                className={primaryLinkClass}
              >
                <Calculator className="h-5 w-5 shrink-0" aria-hidden />
                {t("quoteModalPrimary")}
              </Link>
              <Link
                href={plannerHref}
                onClick={onClose}
                className={secondaryLinkClass}
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                {isKo ? "AI 플래너로" : "Open in planner"}
              </Link>
              <Link
                href={contactHref}
                onClick={onClose}
                className={secondaryLinkClass}
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                {t("quoteModalContact")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MediaDetailQuoteModal({
  open,
  onClose,
  media,
}: {
  open: boolean;
  onClose: () => void;
  media: MediaItem;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="tkad-glass-surface flex max-h-[min(92dvh,920px)] max-w-lg flex-col overflow-hidden p-0 sm:max-h-[90vh]"
      ariaLabelledBy="media-quote-modal-title"
    >
      {open ? (
        <MediaDetailQuoteModalBody
          key={media.id}
          media={media}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
