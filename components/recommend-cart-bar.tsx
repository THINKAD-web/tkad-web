"use client";

import { X, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import { formatPlanCartCountLabel } from "@/lib/plan-cart-limits";

type Props = {
  items: MediaItem[];
  locale: string;
  maxItems: number;
  quoteHref: string;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export default function RecommendCartBar({
  items,
  locale,
  maxItems,
  quoteHref,
  onRemove,
  onClear,
}: Props) {
  const t = useTranslations("recommend");
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
          <ShoppingCart className="h-4 w-4 text-accent" />
          {t("cartTitle")}{" "}
          <span className="text-muted-foreground">
            ({formatPlanCartCountLabel(items.length, maxItems, isKo)})
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 border-2 border-border bg-muted px-3 py-1.5"
            >
              <span className="max-w-[120px] truncate text-xs font-medium text-foreground">
                {isKo ? media.name : (media.nameEn || media.name)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(media.id)}
                aria-label={`${isKo ? media.name : (media.nameEn || media.name)} ${t("cartRemoveSuffix")}`}
                className="text-muted-foreground transition-colors hover:text-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <BtnBlock variant="secondary" size="sm" onClick={onClear}>
            {t("cartClear")}
          </BtnBlock>
          <BtnBlock href={quoteHref} variant="accent" size="sm">
            {t("cartQuote")}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
