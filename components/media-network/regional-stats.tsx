import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  NETWORK_NEON_CARD,
  NETWORK_NEON_PANEL,
} from "@/components/media-network/network-neon-ui";
import {
  formatNetworkPriceWon,
  type NetworkRegionStat,
} from "@/lib/network-media-stats";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  regions: NetworkRegionStat[];
};

export function RegionalStats({ isKo, regions }: Props) {
  if (regions.length === 0) return null;

  return (
    <NeonSection>
      <NeonSectionHead
        number="03"
        kicker={isKo ? "REGIONS" : "REGIONS"}
        title={
          <>
            {isKo ? "지역별 " : "Regional "}
            <span className="tkad-home-accent-text">
              {isKo ? "설치 현황" : "coverage"}
            </span>
          </>
        }
        meta={
          isKo
            ? "주요 광역별 지점 수와 평균 단가"
            : "Site counts and average unit pricing by region"
        }
      />

      <div className={cn(NETWORK_NEON_PANEL, "mt-8 overflow-x-auto p-0 sm:p-0")}>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 tkad-type-note uppercase tracking-widest text-gray-500 dark:border-white/10 dark:text-white/45">
              <th className="px-5 py-3 font-semibold">{isKo ? "지역" : "Region"}</th>
              <th className="px-5 py-3 font-semibold">{isKo ? "지점 수" : "Locations"}</th>
              <th className="px-5 py-3 font-semibold">{isKo ? "설치 면수" : "Units"}</th>
              <th className="px-5 py-3 font-semibold">
                {isKo ? "평균 단가/월" : "Avg. price/mo"}
              </th>
              <th className="px-5 py-3 font-semibold">
                {isKo ? "가용 지점" : "Available"}
              </th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr
                key={r.key}
                className="border-b border-gray-100 transition hover:bg-gray-50/80 dark:border-white/8 dark:hover:bg-white/5"
              >
                <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                  {isKo ? r.labelKo : r.labelEn}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-gray-700 dark:text-white/80">
                  {r.locationCount.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-gray-700 dark:text-white/80">
                  {r.unitCount.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </td>
                <td className="px-5 py-3.5 font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatNetworkPriceWon(r.avgPriceManWon, isKo)}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-emerald-600 dark:text-emerald-400">
                  {r.availableUnits.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {regions.slice(0, 6).map((r) => (
          <div key={`card-${r.key}`} className={NETWORK_NEON_CARD}>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {isKo ? r.labelKo : r.labelEn}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-white/45">{isKo ? "지점" : "Sites"}</dt>
                <dd className="font-semibold tabular-nums">{r.locationCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-white/45">
                  {isKo ? "평균 단가" : "Avg. price"}
                </dt>
                <dd className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatNetworkPriceWon(r.avgPriceManWon, isKo)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </NeonSection>
  );
}
