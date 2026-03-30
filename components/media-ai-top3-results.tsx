"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator, MapPin, Monitor, Sparkles, Star } from "lucide-react";
import { typeLabels, getPrimaryMediaImageUrl } from "@/lib/media-data";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  items: ScoredMedia[];
  onRestartQuiz: () => void;
  onViewFullList: () => void;
  quoteLabel: string;
};

const rankBadgeClass = [
  "bg-gradient-to-br from-amber-400 to-amber-600 shadow-md",
  "bg-gradient-to-br from-slate-400 to-slate-600 shadow-md",
  "bg-gradient-to-br from-amber-800 to-amber-950 shadow-md",
];

function formatDailyExposure(isKo: boolean, n: number | null | undefined): string | null {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  if (v <= 0) return null;
  return isKo ? `일 ${v.toLocaleString()}명 노출` : `${v.toLocaleString()}/day est.`;
}

function availabilityLabel(
  isKo: boolean,
  a: ScoredMedia["item"]["availability"],
): { text: string; className: string } | null {
  if (a === "available") {
    return { text: isKo ? "즉시 예약 가능" : "Available now", className: "bg-emerald-500 text-white" };
  }
  if (a === "reserved" || a === "maintenance") {
    return { text: isKo ? "협의 필요" : "Check availability", className: "bg-slate-700 text-white" };
  }
  return null;
}

export default function MediaAiTop3Results({
  locale,
  items,
  onRestartQuiz,
  onViewFullList,
  quoteLabel,
}: Props) {
  const t = useTranslations();
  const isKo = locale === "ko";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-gold">
          {t("media.ai.resultScreen.badge")}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">
          {t("media.ai.resultScreen.top3Title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("media.ai.resultScreen.top3Subtitle")}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {items.map((s, i) => (
          <motion.div
            key={s.item.id}
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: i * 0.09,
              type: "spring",
              stiffness: 380,
              damping: 26,
            }}
          >
            <Top3Card
              rank={i + 1}
              scored={s}
              isKo={isKo}
              rankBadgeClassName={rankBadgeClass[i] ?? "bg-navy"}
              quoteLabel={quoteLabel}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onRestartQuiz}>
          {t("media.ai.swipe.restartQuiz")}
        </Button>
        <Button type="button" className="btn-gold rounded-full" onClick={onViewFullList}>
          {t("media.ai.resultScreen.viewAllRecommendations")}
        </Button>
      </div>
    </div>
  );
}

function Top3Card({
  rank,
  scored,
  isKo,
  rankBadgeClassName,
  quoteLabel,
}: {
  rank: number;
  scored: ScoredMedia;
  isKo: boolean;
  rankBadgeClassName: string;
  quoteLabel: string;
}) {
  const tMedia = useTranslations("media");
  const m = scored.item;
  const tl = typeLabels[m.type];
  const primaryUrl = getPrimaryMediaImageUrl(m);
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !primaryUrl || imgFailed;
  const exposure = formatDailyExposure(isKo, m.dailyFootTraffic);
  const avail = availabilityLabel(isKo, m.availability);

  return (
    <Card className="relative overflow-hidden border-navy/10 shadow-lg">
      <div
        className={cn(
          "absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white",
          rankBadgeClassName,
        )}
      >
        {rank}
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-100">
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center">
            <Monitor className="h-12 w-12 text-navy/20" />
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
          </>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-navy shadow">
          <Sparkles className="h-3 w-3 text-gold" />
          {scored.score}
        </div>
        {rank === 1 ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-navy shadow">
            <Star className="h-3.5 w-3.5 fill-navy" />
            TOP
          </div>
        ) : null}
      </div>
      <CardHeader className="pb-2">
        <Badge variant="secondary" className="w-fit bg-navy/5 text-[11px] text-navy">
          {isKo ? tl.ko : tl.en}
        </Badge>
        <CardTitle className="text-base leading-snug">
          {isKo ? m.name : m.nameEn}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {(exposure || avail) && (
          <div className="flex flex-wrap items-center gap-2">
            {exposure ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1 text-[11px] font-semibold text-navy">
                👥 {exposure}
              </span>
            ) : null}
            {avail ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  avail.className,
                )}
              >
                🟢 {avail.text}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex items-start gap-1 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="text-xs leading-relaxed">
            {formatMediaLocationShort(m, isKo)}
          </span>
        </div>
        <ul className="space-y-1 text-[11px] leading-relaxed text-navy/80">
          {scored.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-gold">·</span>
              <span>{isKo ? r.ko : r.en}</span>
            </li>
          ))}
        </ul>
        <div className="text-lg font-bold text-navy">
          {formatMediaPriceWonWithSymbol(m.price)}
          <span className="text-xs font-normal text-muted-foreground">
            {" "}
            · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
          </span>
        </div>
        <div className="flex flex-col gap-2 border-t pt-3">
          <Link href={mediaItemDetailPath(m.id)}>
            <Button variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold">
              {isKo ? "상세 보기" : "View details"}
            </Button>
          </Link>
          <Link href={`/quote?media=${m.id}`}>
            <Button size="sm" className="btn-gold w-full rounded-full text-xs font-bold">
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              {quoteLabel}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
