"use client";

import { useCallback, useMemo, useState } from "react";
import { MapPin, Network, ZoomIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import MediaLightbox from "@/components/media-lightbox";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import { NetworkKpiChip } from "@/components/media-network/network-kpi-chip";
import {
  NETWORK_CTA,
  NETWORK_CTA_SECONDARY,
} from "@/components/media-network/network-neon-ui";
import {
  formatNetworkPriceWon,
  type NetworkMediaStats,
} from "@/lib/network-media-stats";
import { resolvePublicMediaImageUrl } from "@/lib/optimized-image-url";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  stats: Pick<
    NetworkMediaStats,
    | "totalLocations"
    | "totalUnits"
    | "networkCount"
    | "nationalAvgPriceManWon"
    | "minUnitsTypical"
    | "heroImage"
    | "galleryImages"
  >;
};

export function NetworkHero({ isKo, stats }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeThumb, setActiveThumb] = useState(0);

  const images = useMemo(() => {
    const raw = [
      ...(stats.heroImage ? [stats.heroImage] : []),
      ...stats.galleryImages,
    ];
    const seen = new Set<string>();
    const resolved: string[] = [];
    for (const url of raw) {
      const src = resolvePublicMediaImageUrl(url);
      if (src && !seen.has(src)) {
        seen.add(src);
        resolved.push(src);
      }
    }
    return resolved;
  }, [stats.heroImage, stats.galleryImages]);

  const hasImage = images.length > 0;
  const mainSrc = hasImage ? images[activeThumb] ?? images[0] : "";
  const thumbs = images.slice(0, 4);

  const openAt = useCallback(
    (i: number) => {
      if (images.length === 0) return;
      setLightboxIndex(Math.min(Math.max(0, i), images.length - 1));
      setLightboxOpen(true);
    },
    [images.length],
  );

  const labels = isKo
    ? {
        close: "닫기",
        prev: "이전",
        next: "다음",
        expand: "크게 보기",
        clickHint: "클릭하여 확대",
      }
    : {
        close: "Close",
        prev: "Previous",
        next: "Next",
        expand: "Expand",
        clickHint: "Click to enlarge",
      };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="min-w-0">
          <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-gray-200 bg-gray-100 shadow-sm dark:border-white/12 dark:bg-black/40">
            {hasImage ? (
              <button
                type="button"
                onClick={() => openAt(activeThumb)}
                className="absolute inset-0 z-10 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label={labels.expand}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainSrc}
                  alt={isKo ? "네트워크 매체 현장" : "Network OOH site"}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  fetchPriority="high"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white/80 text-gray-800 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100 dark:border-white/20 dark:bg-black/50 dark:text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <MediaImagePlaceholder className="h-full w-full" />
            )}
          </div>

          {thumbs.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {thumbs.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveThumb(i)}
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-xl border bg-gray-100 transition dark:bg-black/30",
                    activeThumb === i
                      ? "border-violet-500 ring-2 ring-violet-500/30"
                      : "border-gray-200 opacity-80 hover:opacity-100 dark:border-white/12",
                  )}
                  aria-label={`${labels.expand} ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            <Network className="h-4 w-4" aria-hidden />
            {isKo ? "네트워크 옥외광고" : "Network OOH"}
          </div>

          <div>
            <h1 className="font-display text-3xl font-black leading-tight text-gray-900 dark:text-white sm:text-4xl">
              {isKo ? "네트워크 매체, 전국 어디든" : "Network media, nationwide reach"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-white/60 sm:text-base">
              {isKo
                ? `작은 비용으로 전국 눈길 사로잡기 — 버스쉘터, 아파트, 편의점 앞 등 다지점 패키지를 한 번에.${
                    stats.totalLocations > 0
                      ? ` 전국 ${stats.totalLocations.toLocaleString("ko-KR")}개 지점 · ${stats.networkCount}개 네트워크 운영`
                      : ""
                  }`
                : `Capture attention nationwide at scale — bus shelters, apartments, convenience fronts, and more.${
                    stats.totalLocations > 0
                      ? ` ${stats.totalLocations.toLocaleString("en-US")} sites · ${stats.networkCount} networks`
                      : ""
                  }`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NetworkKpiChip
              label={isKo ? "대당 단가" : "Unit price"}
              value={
                <>
                  {formatNetworkPriceWon(stats.nationalAvgPriceManWon, isKo)}
                  <span className="ml-0.5 text-[10px] font-semibold text-gray-400 dark:text-white/40">
                    {isKo ? "/월" : "/mo"}
                  </span>
                </>
              }
              valueClassName="text-violet-600 dark:text-violet-300"
            />
            <NetworkKpiChip
              label={isKo ? "총 설치 개소" : "Locations"}
              value={stats.totalLocations.toLocaleString(isKo ? "ko-KR" : "en-US")}
            />
            <NetworkKpiChip
              label={isKo ? "최소 수량" : "Min. units"}
              value={
                isKo
                  ? `${stats.minUnitsTypical}면~`
                  : `${stats.minUnitsTypical}+ units`
              }
            />
            <NetworkKpiChip
              label={isKo ? "설치 면수" : "Total units"}
              value={stats.totalUnits.toLocaleString(isKo ? "ko-KR" : "en-US")}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="#calculator" className={NETWORK_CTA}>
              {isKo ? "가격 계산하기" : "Calculate price"}
            </Link>
            <Link href="#map" className={cn(NETWORK_CTA_SECONDARY, "gap-2")}>
              <MapPin className="h-4 w-4" aria-hidden />
              {isKo ? "지도에서 보기" : "View on map"}
            </Link>
          </div>
        </div>
      </div>

      {hasImage ? (
        <MediaLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          altBase={isKo ? "네트워크 매체" : "Network media"}
          labels={labels}
        />
      ) : null}
    </section>
  );
}
