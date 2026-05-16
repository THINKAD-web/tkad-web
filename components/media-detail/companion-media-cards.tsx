"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import { SectionHead } from "@/components/brutalist/section-head";

type Props = {
  items: readonly MediaItem[];
  isKo: boolean;
};

export function CompanionMediaCards({ items, isKo }: Props) {
  const t = useTranslations("mediaDetail.companion");
  const tMedia = useTranslations("media");
  const tDetail = useTranslations("media.detail");

  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t-2 border-border pt-12" aria-labelledby="companion-media-heading">
      <SectionHead
        number="05"
        category={isKo ? "Bundle" : "Bundle"}
        title={t("title")}
        meta={t("desc")}
        className="mb-6"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => {
          const name = isKo ? m.name : m.nameEn || m.name;
          const typeLabel =
            (isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en) ?? m.type;
          const periodKey = mediaPricePeriodTranslationKey(m.pricePeriod);
          return (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className="group flex flex-col border-2 border-border bg-card transition-colors hover:border-accent"
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-border bg-muted">
                <MediaCatalogThumbnail media={m} alt={name} placeholderLabel={name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  [ {typeLabel} ]
                </p>
                <h3
                  id={m.id === items[0]?.id ? "companion-media-heading" : undefined}
                  className="text-base font-bold leading-snug text-foreground group-hover:text-accent"
                >
                  {name}
                </h3>
                <p className="flex items-start gap-1.5 font-mono text-[11px] tracking-tight text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span className="line-clamp-2">
                    {isKo ? m.location : m.locationEn || m.location}
                  </span>
                </p>
                <p className="mt-auto font-mono text-sm font-bold tabular-nums text-foreground">
                  {formatMediaPriceWonWithSymbol(m.price)}
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    / {tDetail(periodKey)}
                  </span>
                </p>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                  {t("viewMedia")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
