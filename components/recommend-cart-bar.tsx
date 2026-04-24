"use client";

import { X, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy">
          <ShoppingCart className="h-4 w-4 text-gold" />
          {t("cartTitle")}{" "}
          <span className="font-mono text-muted-foreground">
            ({items.length}/{maxItems})
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span className="max-w-[120px] truncate font-medium text-navy">
                {isKo ? media.name : (media.nameEn || media.name)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(media.id)}
                aria-label={`${isKo ? media.name : (media.nameEn || media.name)} ${t("cartRemoveSuffix")}`}
                className="text-muted-foreground hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-muted-foreground"
          >
            {t("cartClear")}
          </Button>
          <Link href={`/quote?media=${ids}`}>
            <Button
              size="sm"
              className="btn-gold rounded-full px-5 text-xs font-bold"
            >
              {t("cartQuote")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
