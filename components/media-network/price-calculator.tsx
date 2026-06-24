"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  NETWORK_NEON_CHIP,
  NETWORK_NEON_CHIP_ACTIVE,
  NETWORK_NEON_CTA,
  NETWORK_NEON_PANEL,
} from "@/components/media-network/network-neon-ui";
import {
  NETWORK_DURATION_OPTIONS,
  calculateNetworkPrice,
  formatNetworkPriceWon,
  type NetworkDurationKey,
  type NetworkRegionStat,
} from "@/lib/network-media-stats";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  regions: NetworkRegionStat[];
  nationalAvgPriceManWon: number;
};

export function PriceCalculator({
  isKo,
  regions,
  nationalAvgPriceManWon,
}: Props) {
  const [points, setPoints] = useState(20);
  const [duration, setDuration] = useState<NetworkDurationKey>("month");
  const [regionKey, setRegionKey] = useState(regions[0]?.key ?? "seoul");

  const unitPrice = useMemo(() => {
    const r = regions.find((x) => x.key === regionKey);
    return r?.avgPriceManWon ?? nationalAvgPriceManWon;
  }, [regionKey, regions, nationalAvgPriceManWon]);

  const totalMan = calculateNetworkPrice(points, unitPrice, duration);
  const quoteHref = `/quote?type=network&points=${points}&duration=${duration}&region=${regionKey}`;

  return (
    <NeonSection id="calculator" className="scroll-mt-20">
      <NeonSectionHead
        number="01"
        kicker={isKo ? "PRICE" : "PRICE"}
        title={
          <>
            {isKo ? "실시간 " : "Live "}
            <span className="tkad-home-accent-text">
              {isKo ? "가격 계산기" : "price calculator"}
            </span>
          </>
        }
        meta={
          isKo
            ? "지점 수와 기간을 조정하면 예상 비용이 바로 계산됩니다"
            : "Adjust sites and duration for an instant estimate"
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className={cn(NETWORK_NEON_PANEL, "space-y-8")}>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="network-points"
                className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/45"
              >
                {isKo ? "지점 수" : "Number of sites"}
              </label>
              <span className="font-sans text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {points}
              </span>
            </div>
            <input
              id="network-points"
              type="range"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-violet-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-white/35">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          {regions.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/45">
                {isKo ? "지역 (평균 단가)" : "Region (avg. unit price)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {regions.slice(0, 8).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRegionKey(r.key)}
                    className={cn(
                      NETWORK_NEON_CHIP,
                      regionKey === r.key && NETWORK_NEON_CHIP_ACTIVE,
                    )}
                  >
                    {isKo ? r.labelKo : r.labelEn} ·{" "}
                    {formatNetworkPriceWon(r.avgPriceManWon, isKo)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/45">
              {isKo ? "집행 기간" : "Duration"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NETWORK_DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDuration(opt.key)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    duration === opt.key
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/12 dark:bg-white/5 dark:hover:bg-white/8",
                  )}
                >
                  {isKo ? opt.labelKo : opt.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            NETWORK_NEON_PANEL,
            "flex flex-col justify-center border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 dark:border-violet-400/20",
          )}
        >
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/45">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            {isKo ? "총 예상 비용" : "Estimated total"}
          </p>
          <p className="mt-3 font-sans text-4xl font-bold tabular-nums tracking-normal text-gray-900 dark:text-white sm:text-5xl">
            {formatNetworkPriceWon(totalMan, isKo)}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-white/55">
            {isKo
              ? `${points}지점 × ${formatNetworkPriceWon(unitPrice, isKo)}/월 환산 × 기간계수`
              : `${points} sites × ${formatNetworkPriceWon(unitPrice, isKo)}/mo eq. × duration factor`}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
            {isKo
              ? "* VAT 별도 · 실제 견적은 지점·매체 유형에 따라 달라질 수 있습니다."
              : "* VAT excluded · Final quote may vary by site and media type."}
          </p>
          <Link href={quoteHref} className={cn(NETWORK_NEON_CTA, "mt-8 w-full sm:w-auto")}>
            {isKo ? "이 가격으로 견적받기" : "Get quote at this price"}
          </Link>
        </div>
      </div>
    </NeonSection>
  );
}
