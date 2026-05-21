"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const headline = buildCaseHeadline(item, locale);
  const showAnonymizedBadge = isSampleSuccessCaseId(item.id);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-sm backdrop-blur transition-all duration-300 hover:border-[#22d3ee]/35 hover:shadow-[0_12px_48px_rgba(34,211,238,0.12)] dark:border-white/12 dark:bg-black/40",
        className,
      )}
    >
      <Link href={`/cases/${item.id}`} className="relative block aspect-[16/10] overflow-hidden">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#a855f7]/25 via-[#0a0a0f] to-[#22d3ee]/20 p-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
              [ CASE ]
            </span>
            <p className="mt-2 text-center text-sm font-bold text-white/90">
              {item.clientName}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
            {t("hoverViewDetails")}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {showAnonymizedBadge ? (
            <span className="rounded-full border border-white/25 bg-black/55 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/90">
              {t("badgeAnonymized")}
            </span>
          ) : null}
          <span className="rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#e9d5ff]">
            {item.industry}
          </span>
          {region ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/80">
              <MapPin className="h-2.5 w-2.5" aria-hidden />
              {region}
            </span>
          ) : null}
        </div>
      </Link>

      <div className={cn("flex flex-1 flex-col p-4 text-foreground", compact && "p-3")}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {item.clientName}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-base font-black leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        {headline ? (
          <p className="mt-2 font-mono text-[11px] font-semibold tracking-tight text-[#22d3ee]">
            {headline}
          </p>
        ) : null}
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {item.summaryKo}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {item.mediaUsed.slice(0, 3).map((m) => (
            <span
              key={m}
              className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/60"
            >
              {m}
            </span>
          ))}
        </div>
        <Link
          href={`/contact?case=${encodeURIComponent(item.id)}`}
          className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-[#22d3ee]"
          onClick={(e) => e.stopPropagation()}
        >
          {t("ctaSimilar")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
