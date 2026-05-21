"use client";

import { CountUpValue } from "@/components/count-up-value";
import ScrollAnimate from "@/components/scroll-animate";

type Props = {
  labels: {
    founded: string;
    campaigns: string;
    media: string;
  };
  foundedYear: string;
  campaignsEnd: number;
  mediaEnd: number;
};

export function AboutHeroStats({
  labels,
  foundedYear,
  campaignsEnd,
  mediaEnd,
}: Props) {
  return (
    <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-8 border-t dark:border-white/15 border-gray-200 pt-12 sm:grid-cols-3 sm:gap-10">
      <ScrollAnimate variant="fade-up" delay={0} className="text-center">
        <div className="text-3xl font-extrabold tracking-tight text-gold tabular-nums sm:text-4xl">
          {foundedYear}
        </div>
        <div className="mt-2 text-[11px] font-medium uppercase tracking-wide dark:text-white text-gray-600 sm:text-xs">
          {labels.founded}
        </div>
      </ScrollAnimate>
      <ScrollAnimate variant="fade-up" delay={100} className="text-center">
        <div className="text-3xl font-extrabold tracking-tight text-gold tabular-nums sm:text-4xl">
          <CountUpValue end={campaignsEnd} suffix="+" durationMs={2000} />
        </div>
        <div className="mt-2 text-[11px] font-medium uppercase tracking-wide dark:text-white text-gray-600 sm:text-xs">
          {labels.campaigns}
        </div>
      </ScrollAnimate>
      <ScrollAnimate variant="fade-up" delay={200} className="text-center">
        <div className="text-3xl font-extrabold tracking-tight text-gold tabular-nums sm:text-4xl">
          <CountUpValue end={mediaEnd} suffix="+" durationMs={2200} />
        </div>
        <div className="mt-2 text-[11px] font-medium uppercase tracking-wide dark:text-white text-gray-600 sm:text-xs">
          {labels.media}
        </div>
      </ScrollAnimate>
    </div>
  );
}
