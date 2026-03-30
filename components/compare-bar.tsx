"use client";

import { X, BarChart3, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import type { MediaItem } from "@/lib/media-data";

interface Props {
  items: MediaItem[];
  locale: string;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareBar({ items, locale, onRemove, onClear }: Props) {
  const isKo = locale === "ko";

  if (items.length === 0) return null;
  const ids = items.map((m) => m.id).join(",");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-navy/10 bg-white/95 shadow-[0_-10px_40px_-8px_rgba(26,42,108,0.18)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
        <div className="flex items-center gap-2 text-sm font-bold text-navy">
          <BarChart3 className="h-4 w-4 text-navy" />
          {isKo ? "비교" : "Compare"} ({items.length}/{COMPARE_MAX_ITEMS})
        </div>

        <div className="flex flex-1 items-center gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 rounded-full border border-navy/10 bg-slate-50/90 px-3.5 py-2 text-xs shadow-sm"
            >
              <span className="max-w-[120px] truncate font-medium text-navy">
                {isKo ? media.name : media.nameEn}
              </span>
              <button
                onClick={() => onRemove(media.id)}
                aria-label={`${isKo ? media.name : media.nameEn} ${isKo ? "제거" : "remove"}`}
                className="text-muted-foreground hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs font-semibold text-navy/60 hover:bg-navy/5 hover:text-navy"
          >
            {isKo ? "초기화" : "Clear"}
          </Button>
          <Link href={`/quote?media=${ids}`}>
            <Button
              size="sm"
              className="btn-gold rounded-full px-5 text-xs font-bold"
            >
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              {isKo ? "견적받기" : "Quote"}
            </Button>
          </Link>
          <Link
            href={`/compare?ids=${items.map((m) => m.id).join(",")}`}
          >
            <Button
              size="sm"
              className="rounded-full bg-navy px-6 text-xs font-bold text-white shadow-md shadow-navy/25 hover:bg-navy-light"
              disabled={items.length < 2}
            >
              {isKo ? "비교하기" : "Compare Now"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
