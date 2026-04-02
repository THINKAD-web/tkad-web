"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
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

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 pointer-events-none"
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
    >
      <div className="pointer-events-auto mx-auto flex max-w-4xl gap-3 rounded-2xl border border-white/25 bg-gradient-to-r from-navy-dark via-navy to-navy-light/95 px-4 py-4 shadow-[0_-16px_48px_rgba(18,26,58,0.42)] backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-[1.28]">
          <MediaQuoteCtaButton media={media} variant="sticky" />
        </div>
        <div className="min-w-0 flex-1 sm:max-w-[11rem]">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-14 w-full touch-target border-2 border-white/55 bg-white/12 text-sm font-semibold text-white shadow-none backdrop-blur-sm hover:bg-white/22 hover:text-white sm:h-16"
          >
            <Link href={compareHref}>
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{t("stickyCtaCompare")}</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
