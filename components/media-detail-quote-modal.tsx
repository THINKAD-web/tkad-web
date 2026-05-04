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
    "bg-accent text-white border-accent hover:bg-foreground hover:border-border hover:text-background",
    "h-12 sm:h-14",
  );
  const secondaryLinkClass = cn(
    btnBlockBase,
    "px-6 py-3 text-xs",
    "bg-card text-foreground border-border hover:bg-foreground hover:text-background",
    "h-11",
  );

  return (
    <div className="px-4 pb-5 pt-9 sm:px-6 sm:pb-6 sm:pt-10">
      <div className="mb-4 flex items-start gap-3 border-b-2 border-border pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="media-quote-modal-title"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            [ {t("quoteModalTitle")} ]
          </h2>
          <p className="mt-1.5 text-base font-bold leading-snug text-foreground sm:text-lg">
            {mediaTitle}
          </p>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-foreground/80">
        {t("quoteModalDescription")}
      </p>

      {hasOpts ? (
        <div
          className="mb-5 border-2 border-border bg-muted p-3 sm:p-4"
          role="radiogroup"
          aria-label={t("quoteModalPriceOptionLabel")}
        >
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
                    "relative w-full border-2 p-3 text-left transition-colors sm:p-3.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2",
                    selectedCard
                      ? "border-accent bg-card"
                      : "border-border/15 bg-card hover:border-border/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-5 items-center justify-center border-2 text-[9px] font-bold",
                      selectedCard
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border/20 bg-card text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-2.5 stroke-[4]" />
                  </span>
                  <span className="block pr-8 text-sm font-bold leading-snug text-foreground">
                    {o.label}
                  </span>
                  <span className="mt-1.5 block text-lg font-bold tabular-nums tracking-tight text-accent sm:text-xl">
                    {formatCatalogPriceKrwLong(o.price, locale)}
                  </span>
                  <span className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t(
                      mediaDetailPricePeriodTranslationKey(
                        o.period ?? media.pricePeriod,
                      ),
                    )}
                  </span>
                  {o.description?.trim() ? (
                    <span className="mt-2 block border-t-2 border-border/5 pt-2 text-[11px] leading-relaxed text-foreground/70">
                      {o.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selected ? (
            <p className="mt-3 border-t-2 border-border/10 pt-3 text-sm text-foreground">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("quoteModalSelectedPriceLine")}{" "}
              </span>
              <span className="font-bold text-foreground">
                {selected.label} ·{" "}
                {formatCatalogPriceKrwLong(selected.price, locale)}
              </span>
            </p>
          ) : null}
        </div>
      ) : media.keywordFilter?.priceText ? (
        <p className="mb-5 border-2 border-accent/40 bg-muted px-3 py-2.5 text-sm font-bold text-foreground">
          {media.keywordFilter.priceText}
        </p>
      ) : (
        <div className="mb-5 border-2 border-border bg-card px-3 py-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {isKo ? "기준 요금" : "Base rate"}
          </p>
          <p className="mt-1.5 text-lg font-bold tabular-nums text-accent">
            {formatCatalogPriceKrwLong(media.price, locale)}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
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
      className="max-w-lg border-2 border-border bg-card"
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
