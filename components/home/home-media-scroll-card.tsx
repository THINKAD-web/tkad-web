"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Info, ShieldCheck } from "lucide-react";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import {
  buildHomePopularCardPriceDisplay,
  formatHomePopularCardCpm,
  homePopularCardCpmTooltip,
  homePopularCardDoohTooltip,
} from "@/lib/home-popular-card-display";
import { cn } from "@/lib/utils";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  isKo: boolean;
  priority?: boolean;
};

function CardInfoButton({
  label,
  title,
  className,
}: {
  label: string;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "inline-flex shrink-0 rounded-full p-0.5 text-tkad-muted transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-white/10",
        className,
      )}
    >
      <Info className="h-3 w-3" aria-hidden />
    </button>
  );
}

function VerifiedBadge({ isKo }: { isKo: boolean }) {
  return (
    <span className="tkad-type-note absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      {isKo ? "검증" : "Verified"}
    </span>
  );
}

/** 홈 인기 캐러셀 — 월 환산 primary + 원본 period secondary, CPM·용어 info */
export function HomeMediaScrollCard({
  item,
  href,
  isKo,
  priority,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
  const showDoohHint = item.type?.toUpperCase().includes("DOOH") ?? false;
  const regionParts = [item.region, item.type].filter(Boolean);
  const priceDisplay = buildHomePopularCardPriceDisplay(item, locale, isKo);
  const cpmLabel = formatHomePopularCardCpm(item, locale);

  return (
    <Link
      href={href}
      className={cn(
        "group w-44 shrink-0 snap-start overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5 sm:w-48 md:w-52",
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800">
        {thumb ? (
          <Image
            src={thumb.src}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 176px, 208px"
            priority={priority}
            unoptimized={thumb.unoptimized}
          />
        ) : (
          <div className="tkad-type-note flex h-full items-center justify-center text-tkad-muted">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        {item.isVerified ? <VerifiedBadge isKo={isKo} /> : null}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="tkad-type-title line-clamp-2 leading-snug text-foreground group-hover:text-tkad-accent">
          {item.name}
        </p>
        {regionParts.length > 0 ? (
          <p className="tkad-type-meta flex items-center gap-0.5 line-clamp-1 text-tkad-muted">
            <span className="min-w-0 truncate">{regionParts.join(" · ")}</span>
            {showDoohHint ? (
              <CardInfoButton
                label={isKo ? "DOOH 설명" : "About DOOH"}
                title={homePopularCardDoohTooltip(isKo)}
              />
            ) : null}
          </p>
        ) : null}
        {priceDisplay ? (
          <div className="space-y-0.5">
            <p className="tkad-type-price-accent flex items-center gap-0.5 tkad-home-accent-text tabular-nums">
              <span>{priceDisplay.primary}</span>
              <CardInfoButton
                label={isKo ? "월 환산 단가 설명" : "Monthly rate note"}
                title={
                  priceDisplay.originalPeriodTooltip ??
                  priceDisplay.monthlyEquivalentTooltip
                }
              />
            </p>
            {priceDisplay.secondary ? (
              <p className="tkad-type-note line-clamp-1 tabular-nums text-tkad-muted">
                {priceDisplay.secondary}
              </p>
            ) : null}
          </div>
        ) : null}
        {cpmLabel ? (
          <p className="tkad-type-note flex items-center gap-0.5 tabular-nums text-tkad-muted">
            <span>
              CPM {cpmLabel}
            </span>
            <CardInfoButton
              label={isKo ? "CPM 설명" : "About CPM"}
              title={homePopularCardCpmTooltip(isKo)}
            />
          </p>
        ) : null}
      </div>
    </Link>
  );
}
