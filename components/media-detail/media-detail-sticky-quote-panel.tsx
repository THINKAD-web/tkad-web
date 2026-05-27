"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaDetailAddToCart } from "@/components/media-detail-add-to-cart";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import type { MediaItem } from "@/lib/media-data";
import {
  calculateMediaQuoteByDays,
  formatWonShort,
} from "@/lib/compare-quote";
import {
  formatCatalogPriceFieldWon,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  displayName: string;
  periodLabel: string;
  className?: string;
};

export function MediaDetailStickyQuotePanel({
  media,
  isKo,
  displayName,
  periodLabel,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const days = useMemo(() => {
    if (!startDate || !endDate) return 30;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
    return Number.isFinite(diff) && diff > 0 ? diff : 30;
  }, [startDate, endDate]);

  const quote = useMemo(
    () => calculateMediaQuoteByDays(media, days),
    [media, days],
  );

  const inputCls =
    "h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20";

  return (
    <aside
      className={cn(
        "sticky top-20 hidden rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5 shadow-lg lg:block",
        className,
      )}
    >
      <p className="truncate text-base font-bold dark:text-white text-gray-900">
        {displayName}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums dark:text-white text-gray-900">
        {formatCatalogPriceFieldWon(media.price, locale)}
      </p>
      <p className="text-[11px] dark:text-white/45 text-gray-500">
        {periodLabel}
      </p>

      <div className="mt-5 space-y-3 border-t dark:border-white/10 border-gray-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
          {isKo ? "집행 기간" : "Flight dates"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] dark:text-white/40 text-gray-400">
              {isKo ? "시작" : "Start"}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] dark:text-white/40 text-gray-400">
              {isKo ? "종료" : "End"}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <div className="rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3 text-sm">
          <p className="flex justify-between gap-2 dark:text-white/80 text-gray-700">
            <span>{isKo ? "예상 비용" : "Est. cost"}</span>
            <span className="font-bold tabular-nums dark:text-white text-gray-900">
              {formatWonShort(quote.costWon, isKo ? "ko" : "en")}
            </span>
          </p>
          {quote.impressions > 0 ? (
            <p className="mt-1 flex justify-between gap-2 dark:text-white/60 text-gray-500">
              <span>{isKo ? "예상 노출" : "Est. impressions"}</span>
              <span className="tabular-nums">
                {quote.impressions.toLocaleString(locale)}
                {isKo ? "회" : ""}
              </span>
            </p>
          ) : null}
        </div>

        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={displayName}
          triggerLabel={isKo ? "이 매체로 문의하기 →" : "Inquire about this media →"}
          className="w-full justify-center bg-gradient-to-r from-violet-500 to-cyan-400 border-0 dark:text-white text-gray-900"
        />

        <MediaDetailAddToCart
          mediaId={media.id}
          mediaName={displayName}
          className="w-full"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <MediaFavoriteButton
            mediaId={media.id}
            mediaName={media.name}
            mediaNameEn={media.nameEn}
            compact
          />
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                void navigator.share({
                  title: displayName,
                  url: window.location.href,
                });
              } else {
                void navigator.clipboard?.writeText(window.location.href);
              }
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/12 dark:bg-white/8 dark:text-white/85 dark:hover:bg-white/12"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "공유" : "Share"}
          </button>
        </div>
      </div>
    </aside>
  );
}
