"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import type { MediaLandingPreview } from "@/lib/media-landing-previews";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { cn } from "@/lib/utils";

type Props = {
  pkg: PublicMediaPackage;
  preview?: MediaLandingPreview;
  detailLabel: string;
  matchLabel: (n: number) => string;
};

export function PackageGridCard({
  pkg,
  preview,
  detailLabel,
  matchLabel,
}: Props) {
  const thumbs = preview?.thumbnails ?? [];
  const count = preview?.matchCount ?? 0;

  return (
    <Link
      href={`/media/packages/${encodeURIComponent(pkg.slug)}`}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden border-2 border-border bg-card transition-colors",
        "hover:border-accent/60 hover:bg-muted/40",
      )}
    >
      <div className={cn("relative h-36 overflow-hidden bg-gradient-to-br", pkg.heroColor)}>
        {thumbs.length > 0 ? (
          <div
            className={cn(
              "absolute inset-0 grid gap-0.5",
              thumbs.length === 1 && "grid-cols-1",
              thumbs.length === 2 && "grid-cols-2",
              thumbs.length >= 3 && "grid-cols-3",
            )}
          >
            {thumbs.slice(0, 3).map((url) => {
              const thumb = catalogThumbnailImageProps(url);
              return (
                <div key={url} className="relative min-h-0 min-w-0">
                  {thumb ? (
                    <Image
                      src={thumb.src}
                      alt=""
                      fill
                      className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      sizes="200px"
                      unoptimized={thumb.unoptimized}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-5xl" aria-hidden>
            {pkg.icon}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        {pkg.badgeText ? (
          <span className="absolute left-3 top-3 rounded-md border border-white/25 bg-black/35 px-2 py-0.5 font-display tkad-type-note font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            {pkg.badgeText}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          {pkg.name}
        </h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">{pkg.subtitle}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <div className="min-w-0 space-y-0.5">
            {count > 0 ? (
              <p className="tkad-type-label text-accent">
                {matchLabel(count)}
              </p>
            ) : null}
            {pkg.avgBudget ? (
              <p className="text-xs text-muted-foreground">{pkg.avgBudget}</p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-foreground">
            {detailLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
