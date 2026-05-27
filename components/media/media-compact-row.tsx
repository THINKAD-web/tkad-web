"use client";

import Link from "next/link";
import Image from "next/image";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog";
import { cn } from "@/lib/utils";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  metaLine: string;
  inCompare: boolean;
  inCart: boolean;
  onToggleCompare: () => void;
  onToggleCart: () => void;
};

/** 매체 검색 — 컴팩트 뷰 (한 화면에 더 많이 보이도록 고밀도 행) */
export function MediaCompactRow({
  item,
  href,
  metaLine,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[2.625rem] items-center gap-2 rounded-lg px-1 py-1 transition-colors",
        "hover:bg-gray-50 active:bg-gray-100/80 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]",
      )}
    >
      <div className="relative h-9 w-11 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-300 dark:text-white/20">
            —
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
          {item.name}
        </p>
        {metaLine ? (
          <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
            {metaLine}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {item.isInstantBooking ? (
          <span
            className="mr-0.5 hidden h-4 shrink-0 items-center rounded bg-emerald-500 px-1 text-[9px] font-medium leading-none text-white md:inline-flex"
            title="즉시예약"
          >
            즉시
          </span>
        ) : null}
        <MediaCompareSelectButton
          selected={inCompare}
          onToggle={onToggleCompare}
          className="!h-[1.125rem] !px-1.5 !text-[8px]"
        />
        <MediaCartAddButton
          inCart={inCart}
          onToggle={onToggleCart}
          className="!h-[1.125rem] !px-1.5 !text-[8px]"
        />
      </div>
    </Link>
  );
}
