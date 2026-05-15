type Props = {
  imageUrls: string[];
};

/**
 * 홈 히어로 배경 — 2열 무한 마퀴 (상: 좌→우, 하: 우→좌).
 * 부모가 `pointer-events-none` + 마스크·opacity 처리.
 */
export function HomeHeroMarquee({ imageUrls }: Props) {
  const base =
    imageUrls.length >= 6 ? imageUrls : [...imageUrls, ...imageUrls, ...imageUrls];
  const topTrack = [...base, ...base];
  const bottomBase = [...base].reverse();
  const bottomTrack = [...bottomBase, ...bottomBase];

  return (
    <div className="flex w-max flex-col gap-3">
      <div className="flex w-max gap-3 tkad-hero-marquee-track tkad-hero-marquee-track--lr">
        {topTrack.map((src, i) => (
          <div
            key={`t-${i}-${src.slice(-24)}`}
            className="h-28 w-48 shrink-0 overflow-hidden rounded-none border border-white/10 bg-black/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="aspect-video h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
      <div className="flex w-max gap-3 tkad-hero-marquee-track tkad-hero-marquee-track--rl">
        {bottomTrack.map((src, i) => (
          <div
            key={`b-${i}-${src.slice(-24)}`}
            className="h-28 w-48 shrink-0 overflow-hidden rounded-none border border-white/10 bg-black/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="aspect-video h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
