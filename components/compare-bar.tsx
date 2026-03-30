"use client";

import { X, Layers, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import type { MediaItem } from "@/lib/media-data";
import { useTranslations } from "next-intl";

interface Props {
  items: MediaItem[];
  locale: string;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareBar({ items, locale, onRemove, onClear }: Props) {
  const t = useTranslations("media");
  const isKo = locale === "ko";

  if (items.length === 0) return null;
  const ids = items.map((m) => m.id).join(",");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Layers className="h-4 w-4 shrink-0 text-gold" />
          {t("compareBarTitle")}{" "}
          <span className="font-mono text-muted-foreground">
            ({items.length}/{COMPARE_MAX_ITEMS})
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span className="max-w-[120px] truncate font-medium text-navy">
                {isKo ? media.name : media.nameEn}
              </span>
              <button
                type="button"
                onClick={() => onRemove(media.id)}
                aria-label={`${isKo ? media.name : media.nameEn} ${t("compareRemoveSuffix")}`}
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
            {t("compareClear")}
          </Button>
          <Link href={`/quote?media=${ids}`}>
            <Button
              size="sm"
              className="btn-gold rounded-full px-5 text-xs font-bold"
            >
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              {t("compareQuoteCta")}
            </Button>
          </Link>
          <Link href={`/compare?ids=${items.map((m) => m.id).join(",")}`}>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-navy/25 px-5 text-xs font-bold text-navy"
              disabled={items.length < 2}
            >
              {t("compareOpenCta")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
