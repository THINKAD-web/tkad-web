"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles } from "lucide-react";
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
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-2 rounded-2xl border border-white/20 bg-navy/95 px-2.5 py-2.5 shadow-[0_-8px_32px_rgba(18,26,58,0.35)] backdrop-blur-md sm:gap-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <Button
            asChild
            size="sm"
            className="btn-gold h-10 w-full text-xs font-bold"
          >
            <Link href={`/planner?addMedia=${encodeURIComponent(media.id)}`}>
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tCta("plannerShort")}</span>
            </Link>
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <MediaQuoteCtaButton media={media} variant="sticky" />
        </div>
        <div className="min-w-0 flex-1">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-10 w-full border border-white/40 bg-white/10 text-xs font-semibold text-white shadow-none hover:bg-white/20 hover:text-white"
          >
            <Link href={compareHref}>
              <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t("stickyCtaCompare")}</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
