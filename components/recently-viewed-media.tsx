"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import {
  fetchRecentlyViewedItems,
  readRecentlyViewedIds,
  RECENTLY_VIEWED_MAX,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { type MediaItem, resolveMediaGallery } from "@/lib/media-data";
import { cn } from "@/lib/utils";

const DISPLAY_MAX = RECENTLY_VIEWED_MAX;

interface Props {
  locale: string;
}

export default function RecentlyViewedMedia({ locale }: Props) {
  const isKo = locale === "ko";
  const [items, setItems] = useState<MediaItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ids = readRecentlyViewedIds();
    if (ids.length === 0) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void fetchRecentlyViewedItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeRecentlyViewedChanged(() => {
      void fetchRecentlyViewedItems()
        .then(setItems)
        .catch(() => setItems([]));
    });
  }, []);

  if (!ready) return null;
  if (items.length === 0) return null;

  const hoverLabel = isKo ? "상세 페이지로 이동" : "Open detail page";

  return (
    <section
      className="relative mt-10 md:mt-12"
      aria-label={isKo ? "최근 본 매체" : "Recently viewed media"}
    >
      {/* 모바일: 하단 fixed 아님 — 페이지 스크롤에 포함 */}
      <div className="overflow-hidden rounded-xl bg-muted p-4 md:p-5">
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
          {isKo ? "최근 본 매체" : "Recently viewed"}
        </h3>

        <div
          role="list"
          className={cn(
            "flex min-w-0 flex-nowrap gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth",
            "pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]",
            "[-webkit-overflow-scrolling:touch] touch-pan-x overscroll-x-contain",
            "max-sm:snap-x max-sm:snap-mandatory",
          )}
        >
          {items.slice(0, DISPLAY_MAX).map((media) => {
            const thumb = resolveMediaGallery(media)[0];
            return (
              <Link
                key={media.id}
                role="listitem"
                href={`/media/${media.id}`}
                title={hoverLabel}
                className={cn(
                  "group flex min-w-[min(100%,200px)] max-w-[220px] shrink-0 max-sm:snap-start max-sm:snap-always",
                  "overflow-hidden rounded-lg border border-transparent bg-background shadow-sm",
                  "transition-all duration-200",
                  "hover:border-navy/20 hover:shadow-md hover:ring-1 hover:ring-navy/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
                )}
              >
                <div className="relative h-[60px] w-[80px] shrink-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-3 pl-2.5">
                  <span className="truncate text-[11px] font-semibold leading-tight text-foreground group-hover:text-navy">
                    {isKo ? media.name : media.nameEn}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-navy group-hover:text-navy">
                    ₩{media.price.toLocaleString()}
                    <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
                      {isKo ? "만원" : "10K"}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
          {/* 마지막 카드 뒤 여백 (가로 슬라이드 끝까지 스크롤 시 잘림 방지) */}
          <div className="h-1 w-2 shrink-0 sm:w-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
