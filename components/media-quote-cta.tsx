"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Calculator, Sparkles } from "lucide-react";
import MediaDetailQuoteModal from "@/components/media-detail-quote-modal";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";

export type MediaQuoteCtaVariant = "sticky" | "inline";

/**
 * 매체 상세 전용 견적 CTA — `MediaDetailQuoteModal`을 열어 견적/문의로 분기.
 * sticky 하단바·extras 본문에서 동일 패턴으로 사용합니다.
 */
export function MediaQuoteCtaButton({
  media,
  variant,
  className,
}: {
  media: MediaItem;
  variant: MediaQuoteCtaVariant;
  /** variant 기본 스타일을 덮어쓸 때 */
  className?: string;
}) {
  const t = useTranslations("media.detail");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "sticky"
            ? "h-14 w-full touch-target border-0 bg-gradient-to-b from-gold-light via-gold to-gold-dark text-base font-black tracking-tight text-navy shadow-[0_10px_36px_rgba(201,184,150,0.65)] ring-2 ring-white/60 ring-offset-[3px] ring-offset-navy/25 hover:from-gold hover:via-gold-light hover:to-gold sm:h-16 sm:text-lg sm:tracking-wide"
            : "h-12 min-w-[200px] bg-gradient-to-b from-gold-light via-gold to-gold-dark px-6 text-base font-extrabold text-navy shadow-lg shadow-gold-dark/20 ring-2 ring-gold-light/70 hover:from-gold hover:via-gold-light hover:to-gold-dark sm:h-14 sm:min-w-[220px] sm:text-lg",
          className,
        )}
      >
        {variant === "sticky" ? (
          <Sparkles className="mr-2 h-5 w-5 shrink-0 opacity-90" aria-hidden />
        ) : (
          <Calculator className="mr-2 h-5 w-5 shrink-0" aria-hidden />
        )}
        <span className="truncate">
          {variant === "sticky" ? t("stickyCtaQuoteSticky") : t("quoteCtaInline")}
        </span>
      </Button>
      <MediaDetailQuoteModal
        open={open}
        onClose={() => setOpen(false)}
        media={media}
      />
    </>
  );
}
