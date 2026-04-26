"use client";

import { X, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";

type Props = {
  items: MediaItem[];
  locale: string;
  maxItems: number;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export default function RecommendCartBar({
  items,
  locale,
  maxItems,
  onRemove,
  onClear,
}: Props) {
  const t = useTranslations("recommend");
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  const ids = items.map((m) => m.id).join(",");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-bx-black bg-bx-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black">
          <ShoppingCart className="h-4 w-4 text-bx-accent" />
          {t("cartTitle")}{" "}
          <span className="text-bx-gray-dim">
            ({items.length}/{maxItems})
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 border-2 border-bx-black bg-bx-off px-3 py-1.5"
            >
              <span className="max-w-[120px] truncate text-xs font-medium text-bx-black">
                {isKo ? media.name : (media.nameEn || media.name)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(media.id)}
                aria-label={`${isKo ? media.name : (media.nameEn || media.name)} ${t("cartRemoveSuffix")}`}
                className="text-bx-gray-dim transition-colors hover:text-bx-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BtnBlock variant="secondary" size="sm" onClick={onClear}>
            {t("cartClear")}
          </BtnBlock>
          <BtnBlock href={`/quote?media=${ids}`} variant="accent" size="sm">
            {t("cartQuote")}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
