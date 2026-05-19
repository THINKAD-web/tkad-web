"use client";

import { Sparkles, Trophy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { pickCpmWinner } from "@/lib/compare-quote";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";

type Props = {
  items: MediaItem[];
  isKo: boolean;
  className?: string;
};

export function CompareWinnerCard({ items, isKo, className }: Props) {
  const winner = pickCpmWinner(items, isKo);
  if (!winner) return null;

  const { media, cpm, reason } = winner;
  const locale = isKo ? "ko-KR" : "en-US";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-emerald-400/35 bg-gradient-to-br from-emerald-500/12 via-card to-cyan-500/10 p-5 shadow-[0_18px_60px_rgba(16,185,129,0.12)] sm:p-6",
        className,
      )}
      aria-label={isKo ? "CPM 효율 추천" : "CPM efficiency pick"}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "승자 추천" : "Top pick"}
          </p>
          <h2 className="mt-2 flex flex-wrap items-center gap-2 text-lg font-black tracking-tight text-foreground sm:text-xl">
            <Trophy className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
            <Link
              href={mediaItemDetailPath(media.id)}
              className="hover:text-accent hover:underline"
            >
              {isKo ? media.name : media.nameEn || media.name}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reason}</p>
          <dl className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] tabular-nums">
            <div>
              <dt className="text-muted-foreground">{isKo ? "CPM" : "CPM"}</dt>
              <dd className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                ₩{Math.round(cpm).toLocaleString(locale)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {isKo ? "기준 단가" : "List rate"}
              </dt>
              <dd className="mt-0.5 font-bold text-foreground">
                {formatCatalogPriceFieldWon(media.price, locale)}
              </dd>
            </div>
          </dl>
        </div>
        <p className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          {isKo ? "AI · CPM 효율" : "AI · CPM efficiency"}
        </p>
      </div>
    </section>
  );
}
