"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  readRecentlyViewedRecords,
  subscribeRecentlyViewedChanged,
  type RecentlyViewedRecord,
} from "@/lib/recently-viewed";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

const PANEL_MAX = 3;

function formatPrice(price: number, isKo: boolean) {
  if (!price) return isKo ? "가격 문의" : "Price on request";
  return `${formatCatalogPriceFieldWon(price, isKo ? "ko" : "en")}${isKo ? "/월" : "/mo"}`;
}

export function RecentlyViewedFloatingPanel({ className }: { className?: string }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [records, setRecords] = useState<RecentlyViewedRecord[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setRecords(readRecentlyViewedRecords().slice(0, PANEL_MAX));
    refresh();
    return subscribeRecentlyViewedChanged(refresh);
  }, []);

  if (!mounted || records.length === 0) return null;

  const count = records.length;

  const collapsedLabel = isKo ? `최근 본 매체 (${count})` : `Recent (${count})`;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        title={collapsedLabel}
        aria-label={collapsedLabel}
        className={cn(
          "group flex items-center justify-center overflow-hidden rounded-full border shadow-lg transition-all duration-200",
          "h-10 !w-10 md:!h-14 md:!w-14",
          "hover:!w-auto hover:gap-1.5 hover:px-3 md:hover:px-4",
          "hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
          "bg-white border-gray-200 text-sm font-medium text-gray-800",
          "dark:bg-gray-900 dark:border-white/10 dark:text-white",
          className,
        )}
        data-screenshot="recently-viewed-collapsed"
        aria-expanded={false}
      >
        <Eye
          className="h-5 w-5 shrink-0 md:h-6 md:w-6 text-gray-700 dark:text-white"
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[10rem] group-hover:opacity-100">
          {collapsedLabel}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "w-64 overflow-hidden rounded-2xl border shadow-xl",
        "bg-white border-gray-200 dark:bg-gray-900 dark:border-white/10",
        className,
      )}
      data-screenshot="recently-viewed-expanded"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {isKo ? "최근 본 매체" : "Recently viewed"}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={isKo ? "접기" : "Collapse"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-white/10">
        {records.map((item) => (
          <li key={item.id}>
            <Link
              href={`/media/${item.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/5"
              onClick={() => setExpanded(false)}
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/10">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                    OOH
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {item.name || item.id}
                </p>
                <p className="text-xs tabular-nums text-violet-600 dark:text-violet-300">
                  {formatPrice(item.price, isKo)}
                </p>
                {item.price > 0 ? <MediaPriceExclNote isKo={isKo} className="mt-0.5" /> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/my"
        className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-violet-600 hover:bg-gray-50 dark:border-white/10 dark:text-violet-300 dark:hover:bg-white/5"
        onClick={() => setExpanded(false)}
      >
        {isKo ? "전체 보기 →" : "View all →"}
      </Link>
    </div>
  );
}
