"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContentCardGradientThumb } from "@/components/content/content-card-gradient-thumb";
import { cleanSummary } from "@/lib/content-card-visuals";
import { buildCaseHeadline, primaryRegionLabel } from "@/lib/success-case-hub";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { isSampleSuccessCaseId } from "@/lib/sample-success-case";
import { cn } from "@/lib/utils";

type Props = {
  item: PublicSuccessCaseListItem;
  className?: string;
  compact?: boolean;
};

export function CaseStudyCard({ item, className, compact }: Props) {
  const t = useTranslations("cases");
  const locale = useLocale();
  const isKo = locale === "ko";
  const title = isKo ? item.titleKo : item.titleEn ?? item.titleKo;
  const region = primaryRegionLabel(item, isKo);
  const headlineRaw = buildCaseHeadline(item, locale);
  const headline = headlineRaw ? cleanSummary(headlineRaw) : "";
  const summary = cleanSummary(item.summaryKo);
  const showAnonymizedBadge = isSampleSuccessCaseId(item.id);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white text-left shadow-sm transition-all duration-300 hover:border-[color:var(--qp-accent)]/35 hover:shadow-md dark:border-white/10 dark:bg-gray-900 dark:shadow-none dark:hover:border-[var(--qp-accent)]/35 dark:hover:shadow-[0_12px_48px_rgba(34,211,238,0.12)]",
        className,
      )}
    >
      <Link href={`/cases/${item.id}`} className="relative block overflow-hidden">
        <ContentCardGradientThumb
          thumbnailUrl={item.thumbnailUrl}
          alt={title}
          industry={item.industry}
          heightClass="h-28"
          badge={
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {showAnonymizedBadge ? (
                <span className="rounded-full border border-gray-200 bg-white/90 px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.14em] text-gray-700 shadow-sm dark:border-white/25 dark:bg-black/55 dark:text-white/90">
                  {t("badgeAnonymized")}
                </span>
              ) : null}
              <span className="rounded-full border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--qp-accent)]">
                {item.industry}
              </span>
              {region ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.14em] text-gray-600 shadow-sm dark:border-white/15 dark:bg-black/50 dark:text-white/80">
                  <MapPin className="h-2.5 w-2.5" aria-hidden />
                  {region}
                </span>
              ) : null}
            </div>
          }
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-100/95 via-gray-100/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-gray-900 dark:via-black/15 dark:to-transparent" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-900/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-black/50">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur">
            {t("hoverViewDetails")}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <div className={cn("flex flex-1 flex-col p-3 text-left", !compact && "p-4")}>
        {!compact ? (
          <p className="text-sm text-gray-500 dark:text-white/60">
            {item.clientName}
          </p>
        ) : null}
        <h3
          className={cn(
            "line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-gray-900 dark:text-white",
            !compact && "mt-1.5 text-base",
          )}
        >
          {title}
        </h3>
        {headline ? (
          <p className="mt-1 line-clamp-1 text-xs text-[color:var(--qp-accent)]">
            {headline}
          </p>
        ) : null}
        {!compact && summary ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-white/60">
            {summary}
          </p>
        ) : null}
        {!compact ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.mediaUsed.slice(0, 3).map((m) => (
              <span
                key={m}
                className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.12em] text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
        {!compact ? (
          <Link
            href={`/contact?case=${encodeURIComponent(item.id)}`}
            className="mt-4 inline-flex items-center gap-1 font-display text-xs font-medium uppercase tracking-[0.16em] text-gray-500 transition-colors hover:text-[color:var(--qp-accent)] dark:text-white/60"
            onClick={(e) => e.stopPropagation()}
          >
            {t("ctaSimilar")}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
