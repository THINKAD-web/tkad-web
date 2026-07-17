"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight, Layers, Tag, TrendingUp, Wallet } from "lucide-react";
import {
  PACKAGE_PURPOSE_EN,
  PACKAGE_PURPOSE_KO,
} from "@/data/packages";
import type { ResolvedMediaPackage } from "@/lib/media-packages";
import { buildPackageContactHref } from "@/lib/media-packages";
import { PACKAGE_INDUSTRY_LABELS } from "@/lib/package-industry-labels";
import { cn } from "@/lib/utils";

const HERMES_RING =
  "before:from-hermes/0 before:via-hermes/35 before:to-hermes/0";

const ACCENT_RING_PARTIAL: Partial<
  Record<ResolvedMediaPackage["accent"], string>
> = {
  rose: "before:from-rose-500/0 before:via-rose-500/35 before:to-rose-500/0",
  amber: "before:from-amber-500/0 before:via-amber-500/35 before:to-amber-500/0",
  indigo: "before:from-indigo-500/0 before:via-indigo-500/35 before:to-indigo-500/0",
};

function accentRingClass(accent: ResolvedMediaPackage["accent"]): string {
  return ACCENT_RING_PARTIAL[accent] ?? HERMES_RING;
}

type Props = {
  pkg: ResolvedMediaPackage;
  isKo: boolean;
  cardLabels: {
    media: string;
    impression: string;
    budget: string;
    reason: string;
    industries: string;
    cta: string;
  };
};

export function PackageCard({ pkg, isKo, cardLabels }: Props) {
  const name = isKo ? pkg.nameKo : pkg.nameEn;
  const description = isKo ? pkg.descriptionKo : pkg.descriptionEn;
  const region = isKo ? pkg.regionLabelKo : pkg.regionLabelEn;
  const mediaCount = isKo ? pkg.mediaCountRangeKo : pkg.mediaCountRangeEn;
  const impression = isKo
    ? pkg.expectedImpressionsLabelKo
    : pkg.expectedImpressionsLabelEn;
  const budget = isKo ? pkg.budgetRangeLabelKo : pkg.budgetRangeLabelEn;
  const reason = isKo ? pkg.recommendReasonKo : pkg.recommendReasonEn;
  const purposeMap = isKo ? PACKAGE_PURPOSE_KO : PACKAGE_PURPOSE_EN;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 dark:bg-white/8 bg-gray-100 p-6 backdrop-blur transition-all duration-200",
        "hover:-translate-y-1 hover:bg-white/95 hover:shadow-[0_24px_72px_rgba(15,23,42,0.18)]",
        "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 dark:hover:bg-white/[0.08]",
        "dark:hover:shadow-[0_24px_72px_rgba(0,0,0,0.55)]",
        "before:pointer-events-none before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-br before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100",
        accentRingClass(pkg.accent),
      )}
    >
      {/* 상단 — 지역 + 목적 태그 */}
      <div className="relative flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-hermes/30 bg-hermes/10 px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.16em] text-hermes">
          <Tag className="h-3 w-3" aria-hidden />
          {region}
        </span>
        {pkg.purposes.slice(0, 2).map((p) => (
          <span
            key={p}
            className="inline-flex items-center rounded-full border border-hermes/30 bg-hermes/15 px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.16em] text-hermes"
          >
            {purposeMap[p]}
          </span>
        ))}
      </div>

      {/* 이름 + 설명 */}
      <h3 className="relative mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {name}
      </h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* 통계 3개 */}
      <dl className="relative mt-5 grid grid-cols-3 gap-2 rounded-xl border border-black/5 dark:bg-black bg-white/[0.02] p-3 dark:border-white/8 dark:bg-white/[0.04] sm:gap-3 sm:p-4">
        <Stat
          icon={<Layers className="h-3.5 w-3.5" />}
          label={cardLabels.media}
          value={mediaCount}
        />
        <Stat
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label={cardLabels.impression}
          value={impression}
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label={cardLabels.budget}
          value={budget}
        />
      </dl>

      {/* 추천 이유 */}
      <div className="relative mt-4 rounded-xl border-l-2 border-hermes bg-hermes/10 px-3 py-2 dark:border-hermes/70 dark:bg-hermes/10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-hermes">
          {`// `}{cardLabels.reason}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">
          {reason}
        </p>
      </div>

      {/* 타겟 업종 */}
      {pkg.industryBadges.length > 0 ? (
        <div className="relative mt-4">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {cardLabels.industries}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pkg.industryBadges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-full border border-black/10 dark:bg-white/8 bg-gray-100 px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.14em] text-foreground/85 dark:border-white/12 border-gray-200 dark:bg-white/[0.06] dark:text-white text-gray-800"
              >
                {isKo
                  ? PACKAGE_INDUSTRY_LABELS[b].ko
                  : PACKAGE_INDUSTRY_LABELS[b].en}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {pkg.media.length > 0 ? (
        <div className="relative mt-4">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {isKo ? "구성 매체" : "Included media"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {pkg.media.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/media/${m.id}`}
                  className="inline-flex rounded-full border border-black/10 dark:bg-white/8 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-foreground/85 hover:border-hermes/50 dark:border-white/12 border-gray-200 dark:bg-white/[0.06]"
                >
                  {isKo ? m.name : m.nameEn || m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* CTA */}
      <div className="relative mt-auto pt-5">
        <Link
          href={buildPackageContactHref(pkg.slug)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-hermes px-5 text-sm font-bold text-white shadow-md shadow-hermes/25 transition-transform hover:-translate-y-0.5 hover:bg-hermes/90"
        >
          {cardLabels.cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-hermes" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1 truncate text-[13px] font-bold leading-tight text-foreground sm:text-sm">
        {value}
      </dd>
    </div>
  );
}
