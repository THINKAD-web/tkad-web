"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { typeLabels } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";

export function AiChatbotMediaCards({
  items,
  isKo,
}: {
  items: AiChatbotMediaCard[];
  isKo: boolean;
}) {
  const tMedia = useTranslations("media");
  if (!items.length) return null;
  return (
    <div className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-2 sm:max-w-[min(100%,24rem)]">
      {items.map((m) => {
        const href = mediaItemDetailPath(m.id);
        const label = isKo ? m.name : (m.nameEn || m.name);
        const thumb = m.imageUrl?.trim();
        const typeLabel = isKo
          ? typeLabels[m.type]?.ko
          : typeLabels[m.type]?.en;
        return (
          <Link
            key={m.id}
            href={href}
            className="group flex min-w-0 max-w-full overflow-hidden rounded-xl border border-navy/[0.09] bg-white shadow-sm ring-1 ring-black/[0.03] transition-all duration-150 hover:border-gold/35 hover:shadow-md hover:-translate-y-0.5"
          >
            {/* Thumbnail */}
            <div className="relative h-[5rem] w-[5rem] shrink-0 overflow-hidden bg-gradient-to-br from-navy/[0.06] to-gold/10 sm:h-[5.5rem] sm:w-[5.5rem]">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <MediaImagePlaceholder
                  label={tMedia("imagePreparing")}
                  size="xs"
                  className="h-full w-full"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
              {typeLabel ? (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-navy/50">
                  {typeLabel}
                </span>
              ) : null}
              <p className="line-clamp-2 break-words text-[12px] font-bold leading-snug text-navy group-hover:text-navy-dark">
                {label}
              </p>
              {m.location ? (
                <p className="flex items-center gap-0.5 text-[10px] text-slate-500">
                  <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                  <span className="truncate">{m.location}</span>
                </p>
              ) : null}
              <p className="mt-0.5 text-[12px] font-extrabold tabular-nums text-amber-700">
                {formatMediaPriceWonWithSymbol(m.price)}
                <span className="text-[10px] font-normal text-navy/45">
                  {" "}· {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
                </span>
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
