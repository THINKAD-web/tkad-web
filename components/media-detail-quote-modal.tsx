"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Calculator, Check, MessageCircle, Sparkles } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  formatCatalogPriceKrwLong,
  mediaDetailPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

export default function MediaDetailQuoteModal({
  open,
  onClose,
  media,
}: {
  open: boolean;
  onClose: () => void;
  media: MediaItem;
}) {
  const t = useTranslations("media.detail");
  const locale = useLocale();
  const isKo = locale === "ko";
  const mediaTitle = isKo ? media.name : media.nameEn;

  const opts = media.priceOptions ?? [];
  const hasOpts = opts.length > 0;
  const [optIdx, setOptIdx] = useState(0);

  useEffect(() => {
    if (open) setOptIdx(0);
  }, [open, media.id]);

  useEffect(() => {
    if (optIdx >= opts.length) setOptIdx(0);
  }, [optIdx, opts.length]);

  const safeIdx = hasOpts ? Math.min(Math.max(0, optIdx), opts.length - 1) : 0;
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-lg"
      ariaLabelledBy="media-quote-modal-title"
    >
      <div className="px-6 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-11">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-navy shadow-md">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="media-quote-modal-title"
              className="text-lg font-bold leading-snug text-navy sm:text-xl"
            >
              {t("quoteModalTitle")}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-gold-dark">
              {mediaTitle}
            </p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-navy/75">
          {t("quoteModalDescription")}
        </p>

        {hasOpts ? (
          <div
            className="mb-5 rounded-2xl border border-navy/[0.08] bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-navy/[0.04] sm:p-5"
            role="radiogroup"
            aria-label={t("quoteModalPriceOptionLabel")}
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-navy/50">
              {t("quoteModalPriceOptionLabel")}
            </p>
            <div className="flex max-h-[min(52vh,22rem)] flex-col gap-2.5 overflow-y-auto pr-0.5">
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
                      "relative w-full rounded-xl border p-3.5 text-left transition-all sm:p-4",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2",
                      selectedCard
                        ? "border-gold/55 bg-gradient-to-br from-gold/[0.14] via-white to-amber-50/40 shadow-md ring-2 ring-gold/35"
                        : "border-navy/10 bg-white/90 hover:border-navy/18 hover:shadow-sm",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-3 top-3 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                        selectedCard
                          ? "border-gold-dark bg-gold-dark text-white"
                          : "border-navy/15 bg-white text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                    <span className="block pr-10 text-sm font-bold leading-snug text-navy">
                      {o.label}
                    </span>
                    <span className="mt-2 block text-lg font-bold tabular-nums tracking-tight text-gold-dark sm:text-xl">
                      {formatCatalogPriceKrwLong(o.price, locale)}
                    </span>
                    <span className="mt-1.5 inline-flex w-fit rounded-full border border-navy/10 bg-navy/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy/65">
                      {t(
                        mediaDetailPricePeriodTranslationKey(
                          o.period ?? media.pricePeriod,
                        ),
                      )}
                    </span>
                    {o.description?.trim() ? (
                      <span className="mt-2.5 block border-t border-navy/[0.06] pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                        {o.description}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {selected ? (
              <p className="mt-4 border-t border-navy/10 pt-4 text-sm font-bold text-navy">
                <span className="font-semibold text-muted-foreground">
                  {t("quoteModalSelectedPriceLine")}
                  {": "}
                </span>
                <span className="text-gold-dark">
                  {selected.label} ·{" "}
                  {formatCatalogPriceKrwLong(selected.price, locale)}
                </span>
              </p>
            ) : null}
          </div>
        ) : media.keywordFilter?.priceText ? (
          <p className="mb-5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-sm font-semibold text-navy">
            {media.keywordFilter.priceText}
          </p>
        ) : (
          <div className="mb-5 rounded-2xl border border-navy/10 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
              {isKo ? "기준 요금" : "Base rate"}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-gold-dark">
              {formatCatalogPriceKrwLong(media.price, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                mediaDetailPricePeriodTranslationKey(media.pricePeriod),
              )}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="h-14 w-full bg-gradient-to-b from-gold via-gold to-gold-dark text-base font-extrabold text-navy shadow-lg shadow-gold-dark/25 ring-2 ring-gold-light/90 hover:from-gold-light hover:via-gold hover:to-gold-dark sm:h-[3.75rem] sm:text-lg"
          >
            <Link href={quoteHref} onClick={onClose}>
              <Calculator className="mr-2 h-5 w-5 shrink-0" aria-hidden />
              {t("quoteModalPrimary")}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full border-2 border-navy/20 font-semibold text-navy hover:bg-navy/[0.04]"
          >
            <Link href={contactHref} onClick={onClose}>
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              {t("quoteModalContact")}
            </Link>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
