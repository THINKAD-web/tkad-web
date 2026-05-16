"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight, Layers } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";
import type { ResolvedMediaPackage } from "@/lib/media-packages";
import { buildPackageContactHref } from "@/lib/media-packages";
import { PACKAGE_INDUSTRY_LABELS } from "@/lib/package-industry-labels";
import { mediaItemDetailPath } from "@/lib/media-network-types";

const accentBorder: Record<ResolvedMediaPackage["accent"], string> = {
  hermes: "border-hermes/80 hover:border-hermes",
  violet: "border-violet-500/70 hover:border-violet-400",
  cyan: "border-cyan-500/70 hover:border-cyan-400",
  gold: "border-amber-500/70 hover:border-amber-400",
  rose: "border-rose-500/70 hover:border-rose-400",
};

type Props = {
  pkg: ResolvedMediaPackage;
  index: number;
  isKo: boolean;
  imagePreparingLabel: string;
  quoteCtaLabel: string;
  mediaCountLabel: string;
  includedMediaLabel: string;
};

export function PackageCard({
  pkg,
  index,
  isKo,
  imagePreparingLabel,
  quoteCtaLabel,
  mediaCountLabel,
  includedMediaLabel,
}: Props) {
  const name = isKo ? pkg.nameKo : pkg.nameEn;
  const tagline = isKo ? pkg.taglineKo : pkg.taglineEn;
  const description = isKo ? pkg.descriptionKo : pkg.descriptionEn;
  const reach = isKo ? pkg.reachLabelKo : pkg.reachLabelEn;
  const priceRange = isKo ? pkg.priceRangeLabelKo : pkg.priceRangeLabelEn;
  const preview = pkg.media.slice(0, 3);

  return (
    <article
      className={cn(
        "group relative -mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card transition-colors hover:bg-muted/40",
        accentBorder[pkg.accent],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {`// PKG ${String(index + 1).padStart(2, "0")}`}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {name}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-accent">
            {tagline}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pkg.industryBadges.map((badge) => (
            <span
              key={badge}
              className="border-2 border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground"
            >
              {isKo
                ? PACKAGE_INDUSTRY_LABELS[badge].ko
                : PACKAGE_INDUSTRY_LABELS[badge].en}
            </span>
          ))}
        </div>
      </div>

      <p className="border-b-2 border-border px-4 py-4 text-sm leading-relaxed text-muted-foreground sm:px-5">
        {description}
      </p>

      <div className="grid grid-cols-3 gap-0 border-b-2 border-border">
        {preview.length > 0 ? (
          preview.map((m) => (
            <Link
              key={m.id}
              href={mediaItemDetailPath(m.id)}
              className="relative -ml-[2px] -mt-[2px] block aspect-[4/3] overflow-hidden border-2 border-border bg-muted transition-opacity hover:opacity-90"
            >
              <MediaCatalogThumbnail
                media={m}
                placeholderLabel={imagePreparingLabel}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                sizes="(max-width: 768px) 33vw, 200px"
              />
            </Link>
          ))
        ) : (
          <div className="col-span-3 flex aspect-[4/1] items-center justify-center border-2 border-border bg-muted font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {includedMediaLabel}
          </div>
        )}
      </div>

      <div className="grid gap-px border-b-2 border-border bg-border sm:grid-cols-3">
        <div className="flex flex-col gap-1 bg-card p-4 sm:p-5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {mediaCountLabel}
          </span>
          <span className="flex items-center gap-1.5 text-lg font-bold tabular-nums text-foreground">
            <Layers className="h-4 w-4 text-accent" aria-hidden />
            {pkg.mediaCount}
          </span>
        </div>
        <div className="flex flex-col gap-1 bg-card p-4 sm:p-5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isKo ? "예상 노출" : "Est. reach"}
          </span>
          <span className="text-sm font-bold leading-snug text-foreground">
            {reach}
          </span>
        </div>
        <div className="flex flex-col gap-1 bg-card p-4 sm:p-5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isKo ? "가격 범위" : "Price range"}
          </span>
          <span className="text-sm font-bold leading-snug text-accent">
            {priceRange}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {isKo
            ? `구성 매체 ${pkg.mediaCount}곳 · 맞춤 기간·슬롯 협의`
            : `${pkg.mediaCount} placements · custom flight & slots`}
        </p>
        <BtnBlock
          href={buildPackageContactHref(pkg.slug)}
          variant="accent"
          size="md"
          className="shrink-0"
        >
          {quoteCtaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </BtnBlock>
      </div>
    </article>
  );
}
