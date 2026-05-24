"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import type { MediaItem } from "@/lib/media-data";
import type { AvailabilitySummaryResponse } from "@/lib/use-media-availability-summary";

type Props = {
  catalog: MediaItem[];
  summary: AvailabilitySummaryResponse | null;
  isKo: boolean;
  imagePreparingLabel: string;
};

export function MediaScarcitySection({
  catalog,
  summary,
  isKo,
  imagePreparingLabel,
}: Props) {
  const t = useTranslations("media.availabilityLive");

  const scarceMedia = useMemo(() => {
    if (!summary?.items) return [];
    return catalog
      .filter((m) => summary.items[m.id]?.tier === "scarce")
      .sort(
        (a, b) =>
          (summary.items[a.id]?.availabilityPct ?? 100) -
          (summary.items[b.id]?.availabilityPct ?? 100),
      )
      .slice(0, 5);
  }, [catalog, summary]);

  if (scarceMedia.length === 0) return null;

  return (
    <section
      aria-labelledby="media-scarcity-heading"
      className="mb-8 rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-card to-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {t("scarcityEyebrow")}
          </p>
          <h2
            id="media-scarcity-heading"
            className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl"
          >
            {t("scarcityTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t("scarcityDesc")}
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/20"
        >
          {t("scarcityCta")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="-mx-1 mt-4 flex gap-0 overflow-x-auto pb-1 snap-x snap-mandatory">
        {scarceMedia.map((media) => (
          <div
            key={media.id}
            className="w-[min(72vw,240px)] shrink-0 snap-start px-0.5 sm:w-[220px]"
          >
            <MediaCatalogGridCard
              variant="link"
              media={media}
              isKo={isKo}
              denseMobile
              imagePreparingLabel={imagePreparingLabel}
              availabilityTier={summary?.items[media.id]?.tier}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
