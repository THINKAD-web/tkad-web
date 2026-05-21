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

const ACCENT_RING: Record<ResolvedMediaPackage["accent"], string> = {
  violet: "before:from-violet-500/0 before:via-violet-500/35 before:to-violet-500/0",
  rose: "before:from-rose-500/0 before:via-rose-500/35 before:to-rose-500/0",
  cyan: "before:from-cyan-500/0 before:via-cyan-500/35 before:to-cyan-500/0",
  amber: "before:from-amber-500/0 before:via-amber-500/35 before:to-amber-500/0",
  indigo: "before:from-indigo-500/0 before:via-indigo-500/35 before:to-indigo-500/0",
};

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
        ACCENT_RING[pkg.accent],
      )}
    >
      {/* 상단 — 지역 + 목적 태그 */}
      <div className="relative flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200">
          <Tag className="h-3 w-3" aria-hidden />
          {region}
        </span>
        {pkg.purposes.slice(0, 2).map((p) => (
          <span
            key={p}
            className="inline-flex items-center rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200"
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
      <dl className="relative mt-5 grid grid-cols-3 gap-2 rounded-xl border border-black/5 dark:bg-black bg-white bg-white/[0.02] p-3 dark:border-white/8 dark:bg-white/[0.04] sm:gap-3 sm:p-4">
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
      <div className="relative mt-4 rounded-xl border-l-2 border-cyan-400 bg-cyan-50/60 px-3 py-2 dark:border-cyan-300/70 dark:bg-cyan-400/10">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
          {`// `}{cardLabels.reason}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">
          {reason}
        </p>
      </div>

      {/* 타겟 업종 */}
      {pkg.industryBadges.length > 0 ? (
        <div className="relative mt-4">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {cardLabels.industries}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pkg.industryBadges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-full border border-black/10 dark:bg-white/8 bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/85 dark:border-white/12 border-gray-200 dark:bg-white/[0.06] dark:text-white text-gray-800"
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
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {isKo ? "구성 매체" : "Included media"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {pkg.media.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/media/${m.id}`}
                  className="inline-flex rounded-full border border-black/10 dark:bg-white/8 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-foreground/85 hover:border-cyan-500/40 dark:border-white/12 border-gray-200 dark:bg-white/[0.06]"
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 text-sm font-bold dark:text-white text-gray-900 shadow-[0_10px_28px_rgba(139,92,246,0.30)] transition-transform hover:-translate-y-0.5 dark:shadow-[0_12px_36px_rgba(34,211,238,0.30)]"
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
      <dt className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-cyan-500" aria-hidden>
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
