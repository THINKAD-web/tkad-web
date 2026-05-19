"use client";

import dynamic from "next/dynamic";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";

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
      className="h-72 w-full rounded-2xl border border-white/10 bg-white/5 sm:h-80"
    />
  );
}

type Props = {
  pins: HomeHeroMapPin[];
  mapTitle: string;
  mapHint: string;
};

export function HomeHeroMapSlot({ pins, mapTitle, mapHint }: Props) {
  return (
    <div className="w-full min-w-0">
      <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white/55">
        {mapTitle}
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
        <HomeHeroMapCard pins={pins} />
      </div>
      <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/55">
        {mapHint}
      </p>
    </div>
  );
}
