"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BarChart3, Calculator } from "lucide-react";

export default function MediaDetailStickyCta({
  mediaId,
  compareHref,
}: {
  mediaId: number;
  compareHref: string;
}) {
  const t = useTranslations("media.detail");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 pointer-events-none"
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
    >
      <div className="pointer-events-auto mx-auto flex max-w-4xl gap-3 rounded-2xl border border-white/20 bg-gradient-to-r from-navy-dark via-navy to-navy-light/95 px-4 py-3 shadow-[0_-12px_40px_rgba(18,26,58,0.35)] backdrop-blur-md sm:gap-4 sm:px-5 sm:py-3.5">
        <div className="min-w-0 flex-[1.2]">
          <Button
            asChild
            size="lg"
            className="h-11 w-full touch-target border-0 bg-gold font-bold text-navy shadow-md hover:bg-gold-dark sm:h-12"
          >
            <Link href={`/quote?media=${mediaId}`}>
              <Calculator className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{t("stickyCtaQuote")}</span>
            </Link>
          </Button>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-[11rem]">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 w-full touch-target border-2 border-white/55 bg-white/12 font-semibold text-white shadow-none backdrop-blur-sm hover:bg-white/22 hover:text-white sm:h-12"
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
