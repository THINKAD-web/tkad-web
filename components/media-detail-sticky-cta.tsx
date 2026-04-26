"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import type { MediaItem } from "@/lib/media-data";

export default function MediaDetailStickyCta({
  media,
  compareHref,
}: {
  media: MediaItem;
  compareHref: string;
}) {
  const t = useTranslations("media.detail");
  const tCta = useTranslations("mediaDetail.cta");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-2 border-2 border-bx-accent bg-bx-black p-2 sm:gap-3 sm:p-3">
        <BtnBlock
          href={`/planner?addMedia=${encodeURIComponent(media.id)}`}
          variant="accent"
          size="sm"
          className="min-w-0 flex-1"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{tCta("plannerShort")}</span>
        </BtnBlock>
        <div className="min-w-0 flex-1">
          <MediaQuoteCtaButton media={media} variant="sticky" />
        </div>
        <BtnBlock
          href={compareHref}
          variant="secondary"
          size="sm"
          className="min-w-0 flex-1"
        >
          <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("stickyCtaCompare")}</span>
        </BtnBlock>
      </div>
    </div>
  );
}
