"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import { cn } from "@/lib/utils";

type Props = {
  pkg: PublicMediaPackage;
  detailLabel: string;
};

export function PackageGridCard({ pkg, detailLabel }: Props) {
  return (
    <Link
      href={`/media/packages/${encodeURIComponent(pkg.slug)}`}
      className={cn(
        "group relative flex h-48 flex-col overflow-hidden rounded-2xl",
        "bg-gradient-to-br shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl",
        pkg.heroColor,
      )}
    >
      {pkg.badgeText ? (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {pkg.badgeText}
        </span>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center text-white">
        <span className="text-4xl" aria-hidden>
          {pkg.icon}
        </span>
        <h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">
          {pkg.name}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-white/85">{pkg.subtitle}</p>
      </div>

      <div className="flex items-end justify-between gap-3 bg-black/15 px-4 py-3 text-white backdrop-blur-[2px]">
        {pkg.avgBudget ? (
          <span className="text-xs font-medium text-white/90">{pkg.avgBudget}</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-sm font-bold">
          {detailLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
