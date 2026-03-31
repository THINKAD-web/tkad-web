"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Calculator, LayoutList, MapPin } from "lucide-react";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import { estimatedCpmWon, estimatedMonthlyImpressions } from "@/lib/ai-recommend-metrics";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";
import MediaAiRecommendMap from "@/components/media-ai-recommend-map";
import MediaAiRecommendChart from "@/components/media-ai-recommend-chart";

type Props = {
  locale: string;
  scored: readonly ScoredMedia[];
  top3: readonly ScoredMedia[];
  quoteHref: string;
  onBackToForm: () => void;
  onViewFullList: () => void;
};

const rankRing = [
  "ring-2 ring-amber-400/90",
  "ring-2 ring-slate-400/80",
  "ring-2 ring-amber-900/70",
];

export default function MediaAiRecommendDashboard({
  locale,
  scored,
  top3,
  quoteHref,
  onBackToForm,
  onViewFullList,
}: Props) {
  const tr = useTranslations("recommend");
  const isKo = locale === "ko";
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);

  const mapItems = useMemo(
    () => scored.map((s) => s.item),
    [scored],
  );

  const pinMetaById = useMemo(() => {
    const meta: Record<
      string,
      { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
    > = {};
    for (const s of top3) {
      meta[s.item.id] = { tone: "green", popular: true };
    }
    return meta;
  }, [top3]);

  return (
    <div className="space-y-8 rounded-2xl border border-navy/10 bg-white p-4 shadow-lg sm:p-6 lg:p-8">
      <header className="space-y-1 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold">
          AI
        </p>
        <h2 className="text-xl font-bold text-navy sm:text-2xl">
          {tr("resultTitle", { count: scored.length })}
        </h2>
        <p className="text-sm text-muted-foreground">{tr("resultSubtitle")}</p>
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy">{tr("resultMapTitle")}</h3>
        <MediaAiRecommendMap
          locale={locale}
          items={mapItems}
          selectedId={mapSelectedId}
          onSelectId={setMapSelectedId}
          pinMetaById={pinMetaById}
          fixedMapHeightPx={400}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy">{tr("resultTop3Title")}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((s, i) => (
            <Top3DashCard
              key={s.item.id}
              scored={s}
              rank={i + 1}
              isKo={isKo}
              rankRingClass={rankRing[i] ?? "ring-2 ring-white/20"}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy">{tr("resultChartTitle")}</h3>
        <MediaAiRecommendChart locale={locale} scored={scored} />
      </section>

      <div className="flex flex-col gap-3 border-t border-gold/15 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-navy/15"
            onClick={onBackToForm}
          >
            {tr("backToForm")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-navy/15"
            onClick={onViewFullList}
          >
            <LayoutList className="mr-1.5 h-4 w-4" />
            {tr("viewFullList")}
          </Button>
        </div>
        <Link href={quoteHref}>
          <Button
            type="button"
            size="lg"
            className="btn-gold w-full rounded-full font-bold sm:w-auto"
          >
            <Calculator className="mr-2 h-5 w-5" />
            {tr("resultQuoteCta")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Top3DashCard({
  scored,
  rank,
  isKo,
  rankRingClass,
}: {
  scored: ScoredMedia;
  rank: number;
  isKo: boolean;
  rankRingClass: string;
}) {
  const tr = useTranslations("recommend");
  const tMedia = useTranslations("media");
  const m = scored.item;
  const tl = typeLabels[m.type];
  const monthly = estimatedMonthlyImpressions(m);
  const cpm = estimatedCpmWon(m);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-navy/10 bg-slate-50/80 p-4 shadow-inner",
        rankRingClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-black text-navy">
          {rank}
        </span>
        <span className="text-[10px] font-medium uppercase text-muted-foreground">
          {tr("resultRank", { n: rank })}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-navy">
        {isKo ? m.name : m.nameEn}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {isKo ? tl.ko : tl.en}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{tr("resultFitLabel")}</span>
          <span className="tabular-nums font-semibold text-gold">
            {scored.score}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-navy/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold"
            style={{ width: `${Math.min(100, Math.max(0, scored.score))}%` }}
          />
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tr("resultEstImpressions")}</dt>
          <dd className="tabular-nums font-semibold text-navy">
            {monthly > 0 ? monthly.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tr("resultCpmLabel")}</dt>
          <dd className="tabular-nums font-semibold text-navy">
            {cpm != null && Number.isFinite(cpm)
              ? `₩${Math.round(cpm).toLocaleString()}`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{isKo ? "가격" : "Price"}</dt>
          <dd className="tabular-nums font-semibold text-gold">
            {formatMediaPriceWonWithSymbol(m.price)}
            <span className="text-[10px] font-normal text-slate-500">
              {" "}
              · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 flex items-start gap-1 text-[11px] text-muted-foreground">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gold/70" />
        <span className="line-clamp-2">
          {formatMediaLocationShort(m, isKo)}
        </span>
      </p>

      <Link
        href={mediaItemDetailPath(m.id)}
        className="mt-3 text-xs font-semibold text-gold hover:text-gold/90"
      >
        {isKo ? "상세 보기 →" : "Details →"}
      </Link>
    </div>
  );
}
