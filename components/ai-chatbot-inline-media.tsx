"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { typeLabels } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import {
  formatCatalogPriceFieldWon,
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
    <div className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-2.5 sm:max-w-[min(100%,22rem)]">
      {items.map((m) => {
        const href = mediaItemDetailPath(m.id);
        const label = isKo ? m.name : (m.nameEn || m.name) || m.name;
        const thumb = m.imageUrl?.trim();
        return (
          <Link
            key={m.id}
            href={href}
            className="group flex min-w-0 max-w-full overflow-hidden rounded-2xl border border-navy/[0.1] bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition hover:border-gold/40 hover:shadow-md hover:ring-gold/15"
          >
            <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden bg-gradient-to-br from-navy/[0.07] to-gold/12 sm:h-[4.5rem] sm:w-[4.5rem]">
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  fill
                  sizes="72px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <MediaImagePlaceholder
                  label={tMedia("imagePreparing")}
                  size="xs"
                  className="h-full w-full"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2 sm:px-3">
              <p className="line-clamp-2 break-words text-xs font-bold leading-snug text-navy group-hover:text-navy-dark">
                {label}
              </p>
              <p className="mt-0.5 text-[11px] font-bold tabular-nums text-gold-dark">
                {formatCatalogPriceFieldWon(m.price)}
                <span className="font-semibold text-navy/55">
                  {" "}
                  · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-navy/45">
                {isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
