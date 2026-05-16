"use client";

import { ArrowRight, Calendar, Layers, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { cn } from "@/lib/utils";

function formatPeriod(
  start: string | null,
  end: string | null,
  isKo: boolean,
): string | null {
  if (!start && !end) return null;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
  };
  const a = start
    ? new Date(start).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts)
    : "";
  const b = end
    ? new Date(end).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts)
    : "";
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

type Props = {
  item: PublicSuccessCaseListItem;
  className?: string;
};

export function CaseStudyCard({ item, className }: Props) {
  const t = useTranslations("cases");
  const locale = useLocale();
  const isKo = locale === "ko";
  const title = isKo ? item.titleKo : item.titleEn ?? item.titleKo;
  const period = formatPeriod(item.periodStartIso, item.periodEndIso, isKo);
  const summary = isKo
    ? item.summaryKo
    : "Campaign background, media mix, and verified OOH performance metrics.";

  return (
    <article
      className={cn(
        "group -mt-[2px] -ml-[2px] flex flex-col overflow-hidden border-2 border-border bg-card",
        className,
      )}
    >
      <div className="relative flex h-44 items-center justify-center overflow-hidden border-b-2 border-border bg-muted">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ CASE STUDY ]
            </span>
            <p className="max-w-[14rem] text-sm font-bold leading-snug text-foreground">
              {item.clientName}
            </p>
          </div>
        )}
        <span className="absolute right-3 top-3 border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
          [ {item.industry} ]
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {item.clientName}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>

        <div className="mt-4 space-y-2 border-2 border-border bg-muted/60 p-3 font-mono text-[11px]">
          {period ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Calendar
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden
              />
              <span>{period}</span>
            </p>
          ) : null}
          {item.budgetRange ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Wallet
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden
              />
              <span>
                {t("budgetRangeLabel")}: {item.budgetRange}
              </span>
            </p>
          ) : null}
        </div>

        {item.highlightMetrics.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-0 border-2 border-border">
            {item.highlightMetrics.map((m) => (
              <div
                key={m.key}
                className="-ml-[2px] -mt-[2px] border-2 border-border bg-card p-2 text-center first:ml-0 first:mt-0"
              >
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                  {isKo ? m.labelKo : m.labelEn}
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                  {formatCaseStudyMetricValue(m, locale)}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 border-2 border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <Layers
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("mediaLabel")} ]
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.mediaUsed.slice(0, 4).map((m) => (
                  <span
                    key={m}
                    className="border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <BtnBlock
            href={`/cases/${item.id}`}
            variant="accent"
            size="sm"
            className="w-full"
          >
            {t("viewDetails")}
            <ArrowRight className="h-3.5 w-3.5" />
          </BtnBlock>
          <BtnBlock
            href={`/contact?case=${encodeURIComponent(item.id)}`}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            {t("ctaSimilar")}
          </BtnBlock>
        </div>
      </div>
    </article>
  );
}
