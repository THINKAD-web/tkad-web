"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import MediaDetailQuoteModal from "@/components/media-detail-quote-modal";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";

export type MediaQuoteCtaVariant = "sticky" | "inline" | "feed";

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
  const label =
    variant === "sticky" ? t("stickyCtaQuoteSticky") : t("quoteCtaInline");

  const feedTrigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "inline-flex h-9 min-h-0 min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white tkad-neon-cta-clean shadow-[0_4px_16px_rgba(124,58,237,0.25)] transition-all hover:brightness-110 active:scale-[0.98] sm:flex-none",
        className,
      )}
    >
      <Calculator className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
      <span className="truncate leading-none">{label}</span>
    </button>
  );

  const defaultTrigger = (
    <Button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        variant === "sticky"
          ? "h-11 w-full min-w-0 justify-center rounded-[15px] border-2 border-border bg-accent px-2.5 text-[10.5px] font-black tracking-[0.01em] text-accent-foreground shadow-md transition-colors hover:bg-foreground hover:text-background"
          : "h-12 min-w-[200px] border-2 border-border bg-accent px-6 text-base font-extrabold text-accent-foreground shadow-lg transition-colors hover:bg-foreground hover:text-background sm:h-14 sm:min-w-[220px] sm:text-lg",
        className,
      )}
    >
      {variant === "sticky" ? (
        <Calculator className="mr-1.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
      ) : (
        <Calculator className="mr-2 h-5 w-5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 truncate text-center leading-none">{label}</span>
    </Button>
  );

  return (
    <>
      {variant === "feed" ? feedTrigger : defaultTrigger}
      <MediaDetailQuoteModal
        open={open}
        onClose={() => setOpen(false)}
        media={media}
      />
    </>
  );
}
