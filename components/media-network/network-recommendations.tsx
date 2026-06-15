"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { NETWORK_CARD } from "@/components/media-network/network-neon-ui";
import {
  formatNetworkPriceWon,
  type NetworkFeaturedItem,
} from "@/lib/network-media-stats";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  networks: NetworkFeaturedItem[];
};

export function NetworkRecommendations({ isKo, networks }: Props) {
  const items = useMemo(() => networks.filter((n) => n.id), [networks]);
  if (items.length === 0) return null;

  return (
    <NeonSection>
      <NeonSectionHead
        number="04"
        kicker={isKo ? "RECOMMEND" : "RECOMMEND"}
        title={
          <>
            {isKo ? "이 패키지를 본 사람들이 " : "Others also viewed "}
            <span className="tkad-home-accent-text">
              {isKo ? "함께 본 네트워크" : "these networks"}
            </span>
          </>
        }
        meta={
          isKo
            ? "유사 규모·지역의 네트워크 패키지를 비교해 보세요"
            : "Compare network packages with similar scale and coverage"
        }
      />

      <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((n) => {
          const img = resolveCatalogImageSrc(n.image);
          const name = isKo ? n.name : n.nameEn || n.name;
          return (
            <Link
              key={n.id}
              href={`/media/network/${n.id}`}
              className={cn(
                NETWORK_CARD,
                "group flex w-[min(100%,280px)] shrink-0 flex-col gap-3 sm:w-[280px]",
              )}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-gray-100 bg-gray-100 dark:border-white/8 dark:bg-black/30">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.src}
                    alt={name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <MediaImagePlaceholder
                    className="h-full w-full"
                    label={isKo ? "이미지 없음" : "No image"}
                    size="sm"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate font-display text-base font-bold text-gray-900 dark:text-white">
                  {name}
                </p>
                <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/50">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {n.totalLocations.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  {isKo ? "개소" : " sites"}
                  <span className="text-gray-300 dark:text-white/20">·</span>
                  {isKo ? `최소 ${n.minUnits}면` : `min. ${n.minUnits} units`}
                </p>
                <p className="font-display text-lg font-black tabular-nums text-violet-600 dark:text-violet-300">
                  {formatNetworkPriceWon(n.pricePerUnit, isKo)}
                  <span className="ml-1 text-xs font-semibold text-gray-400 dark:text-white/40">
                    {isKo ? "/월·면" : "/mo·unit"}
                  </span>
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 opacity-0 transition group-hover:opacity-100 dark:text-cyan-400">
                  {isKo ? "상세 보기" : "View details"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </NeonSection>
  );
}
