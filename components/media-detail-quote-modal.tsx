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
  const [optIdx, setOptIdx] = useState(0);

  const safeIdx = hasOpts
    ? Math.min(Math.max(0, optIdx), opts.length - 1)
    : 0;
  const selected = hasOpts ? opts[safeIdx] : undefined;

  const quoteHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("media", media.id);
    if (hasOpts) q.set("po", String(safeIdx));
    q.set("period", inferQuoteCampaignPeriodFromMedia(media, safeIdx));
    return `/quote?${q.toString()}`;
  }, [media, hasOpts, safeIdx, selected]);

  const contactHref = useMemo(() => {
    const q = `/contact?media=${encodeURIComponent(media.id)}`;
    if (!hasOpts) return q;
    return `${q}&po=${safeIdx}`;
  }, [media.id, hasOpts, safeIdx]);

  const btnBlockBase =
    "inline-flex w-full items-center justify-center gap-2 border-2 font-display font-bold uppercase tracking-[0.18em] transition-colors duration-150";
  const primaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12 sm:h-14",
    "rounded-[22px] border dark:border-white/14 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95",
  );
  const secondaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12",
    "rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12",
  );

  return (
    <div className="relative px-4 pb-5 pt-9 dark:text-white text-gray-900 sm:px-6 sm:pb-6 sm:pt-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
      />

      <div className="relative mb-4 flex items-start gap-3 border-b dark:border-white/10 border-gray-200 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="media-quote-modal-title"
            className="font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-600"
          >
            [ {t("quoteModalTitle")} ]
          </h2>
          <p className="mt-1.5 text-base font-black leading-snug dark:text-white text-gray-900 sm:text-lg">
            {mediaTitle}
          </p>
        </div>
      </div>
      <p className="relative mb-4 text-sm leading-relaxed dark:text-white text-gray-700">
        {t("quoteModalDescription")}
      </p>

      {hasOpts ? (
        <div
          className="relative mb-5 rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur sm:p-4"
          role="radiogroup"
          aria-label={t("quoteModalPriceOptionLabel")}
        >
          <p className="mb-2 font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-500">
            [ {t("quoteModalPriceOptionLabel")} ]
          </p>
          <div className="flex max-h-[min(52vh,22rem)] flex-col gap-2 overflow-y-auto pr-0.5">
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
                  onClick={() => setOptIdx(i)}
                  className={cn(
                    "relative w-full rounded-[22px] border p-3 text-left transition-all sm:p-3.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/18 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    selectedCard
                      ? "border-white/22 dark:bg-white/10 bg-gray-100"
                      : "dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 hover:border-white/16 hover:dark:bg-black bg-white/25",
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-xl border text-[9px] font-black",
                      selectedCard
                        ? "dark:border-white/18 border-gray-300 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] dark:text-white text-gray-900"
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
                    <span className="mt-1.5 font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                      {periodLabel}
                    </span>
                  ) : null}
                  {o.description?.trim() ? (
                    <span className="mt-2 block border-t dark:border-white/10 border-gray-200 pt-2 text-[11px] leading-relaxed dark:text-white text-gray-600">
                      {o.description}
                    </span>
                  ) : null}
                  {o.stores?.trim() ? (
                    <details className="mt-2 border-t dark:border-white/10 border-gray-200 pt-2">
                      <summary className="cursor-pointer list-none text-[11px] font-semibold dark:text-violet-300/90 text-violet-700 [&::-webkit-details-marker]:hidden">
                        {isKo ? "포함 지점 보기" : "View locations"}
                      </summary>
                      <span className="mt-1.5 block text-[11px] leading-relaxed dark:text-white/70 text-gray-600">
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
              <span className="font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-500">
                {t("quoteModalSelectedPriceLine")}{" "}
              </span>
              <span className="font-black dark:text-white text-gray-900">
                {selected.label} ·{" "}
                {formatCatalogPriceKrwLong(selected.price, locale)}
              </span>
            </p>
          ) : null}
        </div>
      ) : media.keywordFilter?.priceText ? (
        <p className="mb-5 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-3 py-2.5 text-sm font-semibold dark:text-white text-gray-800 backdrop-blur">
          {media.keywordFilter.priceText}
        </p>
      ) : (
        <div className="mb-5 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-3 py-3 dark:text-white text-gray-900 backdrop-blur">
          <p className="font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
            {isKo ? "기준 요금" : "Base rate"}
          </p>
          <p className="mt-1.5 text-lg font-black tabular-nums dark:text-white text-gray-900">
            {formatCatalogPriceKrwLong(media.price, locale)}
          </p>
          <p className="mt-0.5 text-[9px] dark:text-white text-gray-500">
            {t(
              mediaDetailPricePeriodTranslationKey(media.pricePeriod),
            )}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:gap-2.5">
        <Link
          href={quoteHref}
          onClick={onClose}
          className={primaryLinkClass}
        >
          <Calculator className="h-5 w-5 shrink-0" aria-hidden />
          {t("quoteModalPrimary")}
        </Link>
        <Link
          href={contactHref}
          onClick={onClose}
          className={secondaryLinkClass}
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          {t("quoteModalContact")}
        </Link>
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
      className="tkad-glass-surface max-w-lg overflow-hidden"
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
