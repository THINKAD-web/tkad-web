"use client";

import dynamic from "next/dynamic";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";
import { cn } from "@/lib/utils";

const HomeHeroMapCard = dynamic(
  () => import("@/components/home/home-hero-map-card"),
  {
    ssr: false,
    loading: () => <MapPlaceholder />,
  },
);

function MapPlaceholder() {
  return (
    <div
      aria-hidden
      className="h-72 w-full rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 sm:h-80"
    />
  );
}

type Props = {
  pins: HomeHeroMapPin[];
  mapTitle: string;
  mapHint: string;
  className?: string;
};

export function HomeHeroMapSlot({ pins, mapTitle, mapHint, className }: Props) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <p className="mb-3 font-display text-xs font-medium uppercase tracking-widest dark:text-white text-gray-500">
        {mapTitle}
      </p>
      <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
        <HomeHeroMapCard pins={pins} />
      </div>
      <p className="mt-3 font-display text-[10px] font-semibold uppercase tracking-wider dark:text-white text-gray-500">
        {mapHint}
      </p>
    </div>
  );
}
