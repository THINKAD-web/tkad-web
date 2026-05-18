"use client";

import { useLocale, useTranslations } from "next-intl";
import { BarChart3, Bolt, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
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
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("media.detail");
  const tCta = useTranslations("mediaDetail.cta");
  const displayName = isKo ? media.name : media.nameEn || media.name;
  const contactHref = `/contact?media=${encodeURIComponent(media.id)}`;

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
        <div className="relative space-y-2 p-2.5">
          <p className="truncate px-0.5 text-sm font-bold leading-snug text-white">
            {displayName}
          </p>
          <BtnBlock
            href={contactHref}
            variant="primary"
            size="sm"
            className="min-h-12 w-full justify-center rounded-[15px] border-0 bg-gradient-to-r from-violet-500 to-cyan-400 text-sm font-black tracking-[0.04em] text-white shadow-lg shadow-violet-500/30 hover:opacity-95"
          >
            {t("inquireThisMedia")}
          </BtnBlock>
          {instantBookEligible ? (
            <BtnBlock
              href={`/media/${encodeURIComponent(media.id)}/book`}
              variant="secondary"
              size="sm"
              className="min-h-10 w-full justify-center rounded-[15px] border-white/14 bg-white/8 px-2 text-[11px] tracking-[0.04em] text-white/92 backdrop-blur hover:bg-white/12 hover:text-white"
            >
              <Bolt className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tCta("instantBook")}
            </BtnBlock>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <BtnBlock
              href={`/planner?addMedia=${encodeURIComponent(media.id)}`}
              variant="secondary"
              size="sm"
              className="min-h-10 min-w-0 justify-center rounded-[15px] border-white/14 bg-white/8 px-2 text-[10px] tracking-[0.04em] text-white/92 backdrop-blur hover:bg-white/12 hover:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tCta("plannerShort")}</span>
            </BtnBlock>
            <BtnBlock
              href={compareHref}
              variant="secondary"
              size="sm"
              className="min-h-10 min-w-0 justify-center rounded-[15px] border-white/14 bg-white/8 px-2 text-[10px] tracking-[0.04em] text-white/92 backdrop-blur hover:bg-white/12 hover:text-white"
            >
              <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate text-center">
                {t("stickyCtaCompare")}
              </span>
            </BtnBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
