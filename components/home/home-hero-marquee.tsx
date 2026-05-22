import Image from "next/image";
import { optimizeHeroMarqueeUrl, shouldUseUnoptimizedImage } from "@/lib/optimized-image-url";

type Props = {
  imageUrls: string[];
};

/**
 * 홈 히어로 배경 — 2열 무한 마퀴 (상: 좌→우, 하: 우→좌).
 * 부모가 `pointer-events-none` + 마스크·opacity 처리.
 */
export function HomeHeroMarquee({ imageUrls }: Props) {
  const optimized = imageUrls
    .map((u) => optimizeHeroMarqueeUrl(u))
    .filter((u): u is string => Boolean(u));
  const base =
    optimized.length >= 6
      ? optimized
      : [...optimized, ...optimized, ...optimized];
  const topTrack = [...base, ...base];
  const bottomBase = [...base].reverse();
  const bottomTrack = [...bottomBase, ...bottomBase];

  return (
    <div className="flex w-max flex-col gap-3">
      <div className="flex w-max gap-3 tkad-hero-marquee-track tkad-hero-marquee-track--lr">
        {topTrack.map((src, i) => (
          <div
            key={`t-${i}-${src.slice(-24)}`}
            className="relative h-28 w-48 shrink-0 overflow-hidden rounded-none border dark:border-white/10 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="192px"
              className="object-cover"
              loading={i < 4 ? "eager" : "lazy"}
              priority={i < 2}
              unoptimized={shouldUseUnoptimizedImage(src)}
            />
          </div>
        ))}
      </div>
      <div className="flex w-max gap-3 tkad-hero-marquee-track tkad-hero-marquee-track--rl">
        {bottomTrack.map((src, i) => (
          <div
            key={`b-${i}-${src.slice(-24)}`}
            className="relative h-28 w-48 shrink-0 overflow-hidden rounded-none border dark:border-white/10 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="192px"
              className="object-cover"
              loading="lazy"
              unoptimized={shouldUseUnoptimizedImage(src)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
