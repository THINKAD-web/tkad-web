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
} from "@/lib/media-price-format";
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
    const q = `/quote?media=${encodeURIComponent(media.id)}`;
    if (!hasOpts) return q;
    return `${q}&po=${safeIdx}`;
  }, [media.id, hasOpts, safeIdx]);

  const contactHref = useMemo(() => {
    const q = `/contact?media=${encodeURIComponent(media.id)}`;
    if (!hasOpts) return q;
    return `${q}&po=${safeIdx}`;
  }, [media.id, hasOpts, safeIdx]);

  const btnBlockBase =
    "inline-flex w-full items-center justify-center gap-2 border-2 font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-150";
  const primaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12 sm:h-14",
    "rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95",
  );
  const secondaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "h-12",
    "rounded-[18px] border border-white/14 bg-white/8 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12",
  );

  return (
    <div className="relative px-4 pb-5 pt-9 text-white sm:px-6 sm:pb-6 sm:pt-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
      />

      <div className="relative mb-4 flex items-start gap-3 border-b border-white/10 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/14 bg-white/8 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="media-quote-modal-title"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/65"
          >
            [ {t("quoteModalTitle")} ]
          </h2>
          <p className="mt-1.5 text-base font-black leading-snug text-white sm:text-lg">
            {mediaTitle}
          </p>
        </div>
      </div>
      <p className="relative mb-4 text-sm leading-relaxed text-white/75">
        {t("quoteModalDescription")}
      </p>

      {hasOpts ? (
        <div
          className="relative mb-5 rounded-[22px] border border-white/12 bg-black/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur sm:p-4"
          role="radiogroup"
          aria-label={t("quoteModalPriceOptionLabel")}
        >
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">
            [ {t("quoteModalPriceOptionLabel")} ]
          </p>
          <div className="flex max-h-[min(52vh,22rem)] flex-col gap-2 overflow-y-auto pr-0.5">
            {opts.map((o, i) => {
              const selectedCard = safeIdx === i;
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
                      ? "border-white/22 bg-white/10"
                      : "border-white/10 bg-black/20 hover:border-white/16 hover:bg-black/25",
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-xl border text-[9px] font-black",
                      selectedCard
                        ? "border-white/18 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white"
                        : "border-white/12 bg-white/6 text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-2.5 stroke-[4]" />
                  </span>
                  <span className="block pr-10 text-sm font-black leading-snug text-white">
                    {o.label}
                  </span>
                  <span className="mt-1.5 block text-lg font-black tabular-nums tracking-tight text-white sm:text-xl">
                    {formatCatalogPriceKrwLong(o.price, locale)}
                  </span>
                  <span className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white/55">
                    {t(
                      mediaDetailPricePeriodTranslationKey(
                        o.period ?? media.pricePeriod,
                      ),
                    )}
                  </span>
                  {o.description?.trim() ? (
                    <span className="mt-2 block border-t border-white/10 pt-2 text-[11px] leading-relaxed text-white/65">
                      {o.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selected ? (
            <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/80">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
                {t("quoteModalSelectedPriceLine")}{" "}
              </span>
              <span className="font-black text-white">
                {selected.label} ·{" "}
                {formatCatalogPriceKrwLong(selected.price, locale)}
              </span>
            </p>
          ) : null}
        </div>
      ) : media.keywordFilter?.priceText ? (
        <p className="mb-5 rounded-[18px] border border-white/12 bg-black/20 px-3 py-2.5 text-sm font-semibold text-white/85 backdrop-blur">
          {media.keywordFilter.priceText}
        </p>
      ) : (
        <div className="mb-5 rounded-[18px] border border-white/12 bg-black/20 px-3 py-3 text-white backdrop-blur">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/55">
            {isKo ? "기준 요금" : "Base rate"}
          </p>
          <p className="mt-1.5 text-lg font-black tabular-nums text-white">
            {formatCatalogPriceKrwLong(media.price, locale)}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-white/55">
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
