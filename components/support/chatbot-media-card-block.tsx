"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import {
  chatbotCardToCatalogItem,
  formatChatbotCardPrice,
} from "@/lib/ai-chatbot-media-adapter";
import { PlanCartToggleButton } from "@/components/plan/plan-cart-toggle-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { cn } from "@/lib/utils";

type Props = {
  card: AiChatbotMediaCard;
  isKo: boolean;
  className?: string;
};

export function ChatbotMediaCardBlock({ card, isKo, className }: Props) {
  const t = useTranslations("aiChatbot");
  const catalog = chatbotCardToCatalogItem(card);
  const href = `/media/${card.id}`;
  const priceLabel = formatChatbotCardPrice(card, isKo);
  const thumb = catalogThumbnailImageProps(catalog.thumbnailUrl);
  const planItem = planCartItemFromCatalog(catalog, "ai_recommend");

  const metaParts = [card.location, card.region].filter(Boolean);
  const metaLine = metaParts.join(" · ");

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white",
        className,
      )}
    >
      <div className="flex gap-2.5 p-2.5">
        <Link
          href={href}
          className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          {thumb ? (
            <Image
              src={thumb.src}
              alt=""
              fill
              className="object-cover"
              sizes="72px"
              unoptimized={thumb.unoptimized}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              —
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block text-sm font-semibold leading-snug text-foreground hover:underline"
          >
            {isKo ? card.name : card.nameEn || card.name}
          </Link>
          {metaLine ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {metaLine}
            </p>
          ) : null}
          <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-300">
            {priceLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t dark:border-white/10 border-gray-100 px-2 py-1.5">
        <Link
          href={href}
          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/10"
        >
          {t("detailLink")}
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <MediaCompareSelectButton
            mediaId={card.id}
            compareEntry={{
              id: card.id,
              name: card.name,
              nameEn: card.nameEn || card.name,
            }}
            gridInline
            className="!h-7 !px-2 !text-[10px]"
          />
          <PlanCartToggleButton
            item={planItem}
            addedFrom="ai_recommend"
            gridInline
            className="!h-7 !px-2 !text-[10px]"
          />
        </div>
      </div>
    </article>
  );
}
