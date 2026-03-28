"use client";

import { X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";

interface Props {
  items: MediaItem[];
  locale: string;
  onRemove: (id: number) => void;
  onClear: () => void;
}

export default function CompareBar({ items, locale, onRemove, onClear }: Props) {
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy">
          <BarChart3 className="h-4 w-4 text-gold" />
          {isKo ? "비교" : "Compare"} ({items.length}/3)
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {items.map((media) => (
            <div
              key={media.id}
              className="flex shrink-0 items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span className="max-w-[120px] truncate font-medium text-navy">
                {isKo ? media.name : media.nameEn}
              </span>
              <button
                onClick={() => onRemove(media.id)}
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
            {isKo ? "초기화" : "Clear"}
          </Button>
          <Link
            href={`/compare?ids=${items.map((m) => m.id).join(",")}`}
          >
            <Button
              size="sm"
              className="bg-gold text-navy hover:bg-gold-dark rounded-full px-5 text-xs font-bold"
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
