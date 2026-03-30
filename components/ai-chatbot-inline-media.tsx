"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { typeLabels } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";

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
    <div className="mt-3 flex w-full max-w-[min(100%,22rem)] flex-col gap-2.5">
      {items.map((m) => {
        const href = mediaItemDetailPath(m.id);
        const label = isKo ? m.name : m.nameEn || m.name;
        const thumb = m.imageUrl?.trim();
        return (
          <Link
            key={m.id}
            href={href}
            className="group flex overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm ring-1 ring-black/[0.03] transition hover:border-gold/50 hover:shadow-md hover:ring-gold/20"
          >
            <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-gradient-to-br from-navy/8 to-gold/15">
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
            <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
              <p className="line-clamp-2 text-xs font-bold leading-snug text-navy group-hover:text-navy-dark">
                {label}
              </p>
              <p className="mt-0.5 text-[11px] font-bold tabular-nums text-gold-dark">
                ₩{m.price.toLocaleString()}
                <span className="font-semibold text-navy/55">
                  {isKo ? "만/월" : " (10K/mo)"}
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
