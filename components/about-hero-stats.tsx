"use client";

import { CountUpValue } from "@/components/count-up-value";

export function AboutHeroStats({ isKo }: { isKo: boolean }) {
  return (
    <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-10 sm:gap-8">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-gold tabular-nums sm:text-3xl">
          <CountUpValue end={15} suffix="+" durationMs={1600} />
        </div>
        <div className="mt-1 text-[11px] font-medium tracking-wide text-white/55 uppercase sm:text-xs">
          {isKo ? "업계 경력(년)" : "Years in OOH"}
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-extrabold text-gold tabular-nums sm:text-3xl">
          <CountUpValue end={500} suffix="+" durationMs={2200} />
        </div>
        <div className="mt-1 text-[11px] font-medium tracking-wide text-white/55 uppercase sm:text-xs">
          {isKo ? "검증 매체" : "Verified media"}
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-extrabold text-gold tabular-nums sm:text-3xl">
          <CountUpValue end={50} suffix="+" durationMs={1800} />
        </div>
        <div className="mt-1 text-[11px] font-medium tracking-wide text-white/55 uppercase sm:text-xs">
          {isKo ? "글로벌 거점" : "Global hubs"}
        </div>
      </div>
    </div>
  );
}
