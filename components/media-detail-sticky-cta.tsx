"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Bolt, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import type { MediaItem } from "@/lib/media-data";

export default function MediaDetailStickyCta({
  media,
  compareHref,
  instantBookEligible = false,
}: {
  media: MediaItem;
  compareHref: string;
  instantBookEligible?: boolean;
}) {
  const t = useTranslations("media.detail");
  const tCta = useTranslations("mediaDetail.cta");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
    >
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[22px] border border-white/14 bg-black/55 shadow-[0_-10px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 tkad-neon-grid"
        />
        <div className="relative flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-white/80">
            [ MEDIA ACTIONS ]
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
            {instantBookEligible ? `// ` + "4 OPTIONS" : `// ` + "3 OPTIONS"}
          </span>
        </div>
        {instantBookEligible ? (
          <div className="border-b border-white/10 p-2.5">
            <BtnBlock
              href={`/media/${encodeURIComponent(media.id)}/book`}
              variant="primary"
              size="sm"
              className="min-h-11 w-full justify-center rounded-[15px] px-2 text-[11px] font-black tracking-[0.06em]"
            >
              <Bolt className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tCta("instantBook")}
            </BtnBlock>
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-2 p-2.5">
          <BtnBlock
            href={`/planner?addMedia=${encodeURIComponent(media.id)}`}
            variant="secondary"
            size="sm"
            className="min-h-11 min-w-0 justify-center rounded-[15px] border-white/14 bg-white/8 px-2 text-[10px] tracking-[0.04em] text-white/92 backdrop-blur hover:bg-white/12 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{tCta("plannerShort")}</span>
          </BtnBlock>
          <div className="min-w-0">
            <MediaQuoteCtaButton
              media={media}
              variant="sticky"
              className="min-h-11 rounded-[15px] px-2 shadow-[0_12px_30px_rgba(0,0,0,0.42)]"
            />
          </div>
          <BtnBlock
            href={compareHref}
            variant="secondary"
            size="sm"
            className="min-h-11 min-w-0 justify-center rounded-[15px] border-white/14 bg-white/8 px-2 text-[10px] tracking-[0.04em] text-white/92 backdrop-blur hover:bg-white/12 hover:text-white"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate text-center">{t("stickyCtaCompare")}</span>
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
