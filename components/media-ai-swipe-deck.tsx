"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  Calculator,
  Heart,
  MapPin,
  Monitor,
  RotateCcw,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { typeLabels, getPrimaryMediaImageUrl } from "@/lib/media-data";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import type { SwipeAction, SwipeVote } from "@/lib/ai-media-swipe-top3";
import type { ScoredSwipeItem } from "@/lib/ai-swipe-recommend";

export const SWIPE_DECK_SIZE = 10;

const SWIPE_COMMIT = 88;
const UP_COMMIT = 72;

function formatDailyExposure(isKo: boolean, n: number | null | undefined): string | null {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  if (v <= 0) return null;
  return isKo ? `일 ${v.toLocaleString()}명 노출` : `${v.toLocaleString()}/day est.`;
}

function availabilityLabel(isKo: boolean, a: MediaItem["availability"]): { text: string; className: string } | null {
  if (a === "available") {
    return {
      text: isKo ? "즉시 예약 가능" : "Available now",
      className: "bg-emerald-500 text-white",
    };
  }
  if (a === "reserved" || a === "maintenance") {
    return {
      text: isKo ? "협의 필요" : "Check availability",
      className: "bg-slate-700 text-white",
    };
  }
  return null;
}

type Props = {
  locale: string;
  items: (ScoredMedia | ScoredSwipeItem)[];
  compareItems: MediaItem[];
  toggleCompare: (m: MediaItem) => void;
  isInCompare: (id: string) => boolean;
  maxSelectionItems: number;
  addCompareLabel: string;
  quoteLabel: string;
  quoteQueryPicked: string;
  onRestartQuiz: () => void;
  onShowList: () => void;
  onSessionComplete: (votes: SwipeVote[]) => void;
};

export default function MediaAiSwipeDeck({
  locale,
  items: itemsRaw,
  compareItems,
  toggleCompare,
  isInCompare,
  maxSelectionItems,
  addCompareLabel,
  quoteLabel,
  quoteQueryPicked,
  onRestartQuiz,
  onShowList,
  onSessionComplete,
}: Props) {
  const t = useTranslations();
  const isKo = locale === "ko";
  const items = itemsRaw.slice(0, SWIPE_DECK_SIZE);
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<"left" | "right" | "up" | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef({ x: 0, y: 0 });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const activePointer = useRef<number | null>(null);
  const votesRef = useRef<SwipeVote[]>([]);
  const sessionDoneRef = useRef(false);
  const [heartBurst, setHeartBurst] = useState(0);

  const current = items[index];
  const next = items[index + 1];
  const next2 = items[index + 2];

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragY(0);
    dragRef.current = { x: 0, y: 0 };
    startRef.current = null;
    activePointer.current = null;
  }, []);

  const goNext = useCallback(
    (dir: "left" | "right" | "up", action: SwipeAction) => {
      if (!current || exit) return;
      const vote: SwipeVote = {
        id: current.item.id,
        action,
        scored: current,
      };
      votesRef.current.push(vote);

      if (action === "like" || action === "super") {
        if (!isInCompare(current.item.id) && compareItems.length < maxSelectionItems) {
          toggleCompare(current.item);
        }
        setHeartBurst((k) => k + 1);
      }

      setExit(dir);
      window.setTimeout(() => {
        setExit(null);
        resetDrag();
        setIndex((i) => {
          const nextI = i + 1;
          if (nextI >= items.length && !sessionDoneRef.current) {
            sessionDoneRef.current = true;
            window.setTimeout(() => {
              onSessionComplete([...votesRef.current]);
            }, 0);
          }
          return nextI;
        });
      }, 220);
    },
    [
      compareItems.length,
      current,
      exit,
      isInCompare,
      items.length,
      maxSelectionItems,
      onSessionComplete,
      resetDrag,
      toggleCompare,
    ],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!current || exit) return;
    activePointer.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || activePointer.current !== e.pointerId || exit) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    dragRef.current = { x: dx, y: dy };
    setDragX(dx);
    setDragY(dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    const { x: dx, y: dy } = dragRef.current;
    resetDrag();

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absY >= UP_COMMIT && absY >= absX && dy < 0) {
      goNext("up", "super");
      return;
    }
    if (absX >= SWIPE_COMMIT && absX >= absY) {
      if (dx > 0) goNext("right", "like");
      else goNext("left", "pass");
    }
  };

  const pass = () => {
    if (!current) return;
    goNext("left", "pass");
  };

  const like = () => {
    if (!current) return;
    goNext("right", "like");
  };

  const superLike = () => {
    if (!current) return;
    goNext("up", "super");
  };

  if (!current) {
    if (items.length > 0 && index >= items.length) {
      return (
        <div className="flex min-h-[120px] items-center justify-center py-8">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex min-h-[min(70dvh,520px)] flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-navy/20 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
        <Sparkles className="h-14 w-14 text-gold" />
        <div>
          <p className="text-lg font-bold text-navy">{t("media.ai.swipe.allSeenTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("media.ai.swipe.allSeenBody")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={onRestartQuiz}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("media.ai.swipe.restartQuiz")}
          </Button>
          <Button type="button" className="btn-gold rounded-full" onClick={onShowList}>
            {t("media.ai.swipe.viewList")}
          </Button>
        </div>
      </div>
    );
  }

  const rotDeg =
    exit === "right" ? 14 : exit === "left" ? -14 : exit === "up" ? 0 : dragX * 0.06;

  const exitX =
    exit === "left" ? -420 : exit === "right" ? 420 : exit === "up" ? 0 : dragX;
  const exitY = exit === "up" ? -520 : 0;
  const busy = Boolean(exit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">
            {t("media.ai.swipe.modeLabel")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("media.ai.swipe.stackHint", { current: index + 1, total: items.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={onRestartQuiz} disabled={busy}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t("media.ai.swipe.restartQuiz")}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="rounded-full text-xs" onClick={onShowList} disabled={busy}>
            {t("media.ai.swipe.viewList")}
          </Button>
          <Link href={`/quote?media=${quoteQueryPicked}`}>
            <Button size="sm" className="btn-gold rounded-full text-xs font-bold" disabled={!quoteQueryPicked || busy}>
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              {compareItems.length > 0 ? t("media.ai.quotePicked") : t("media.ai.quoteTop3")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md pb-6">
        <HeartBurst burstKey={heartBurst} />
        {next2 ? (
          <div
            className="pointer-events-none absolute inset-x-6 top-4 h-[min(68dvh,440px)] scale-[0.92] rounded-3xl border border-navy/10 bg-white shadow-md opacity-50"
            aria-hidden
          />
        ) : null}
        {next ? (
          <div
            className="pointer-events-none absolute inset-x-3 top-2 h-[min(68dvh,440px)] scale-[0.96] rounded-3xl border border-navy/10 bg-white shadow-lg opacity-75"
            aria-hidden
          />
        ) : null}

        <SwipeCard
          key={current.item.id}
          scored={current}
          isKo={isKo}
          dragX={exitX}
          dragY={exitY + (exit ? 0 : dragY)}
          rotationDeg={rotDeg}
          exiting={Boolean(exit)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          addCompareLabel={addCompareLabel}
          quoteLabel={quoteLabel}
          inCompare={isInCompare(current.item.id)}
          onToggleCompare={() => toggleCompare(current.item)}
          disableCompare={
            !isInCompare(current.item.id) && compareItems.length >= maxSelectionItems
          }
        />

        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={pass}
            disabled={busy}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-500 shadow-md transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            aria-label={t("media.ai.swipe.skip")}
          >
            <X className="h-7 w-7 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={superLike}
            disabled={busy}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-lg transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            aria-label={t("media.ai.swipe.superLike")}
          >
            <Star className="h-7 w-7 fill-amber-400 text-amber-600" />
          </button>
          <button
            type="button"
            onClick={like}
            disabled={busy}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400 bg-white text-emerald-500 shadow-lg transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            aria-label={t("media.ai.swipe.like")}
          >
            <Heart className="h-8 w-8 fill-emerald-500" />
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t("media.ai.swipe.gestureHint")}
        </p>
      </div>
    </div>
  );
}

function HeartBurst({ burstKey }: { burstKey: number }) {
  if (!burstKey) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-visible">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={`${burstKey}-${i}`}
          className="absolute text-lg text-emerald-500"
          initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: 1.1,
            x: Math.sin((i / 14) * Math.PI * 2) * 92,
            y: Math.cos((i / 14) * Math.PI * 2) * -92,
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          ♥
        </motion.span>
      ))}
    </div>
  );
}

function SwipeCard({
  scored,
  isKo,
  dragX,
  dragY,
  rotationDeg,
  exiting,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  addCompareLabel,
  quoteLabel,
  inCompare,
  onToggleCompare,
  disableCompare,
}: {
  scored: ScoredMedia | ScoredSwipeItem;
  isKo: boolean;
  dragX: number;
  dragY: number;
  rotationDeg: number;
  exiting: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  addCompareLabel: string;
  quoteLabel: string;
  inCompare: boolean;
  onToggleCompare: () => void;
  disableCompare: boolean;
}) {
  const tMedia = useTranslations("media");
  const m = scored.item;
  const tl = typeLabels[m.type];
  const primaryUrl = getPrimaryMediaImageUrl(m);
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !primaryUrl || imgFailed;
  const exposure = formatDailyExposure(isKo, m.dailyFootTraffic);
  const avail = availabilityLabel(isKo, m.availability);
  const unexpected = (scored as ScoredSwipeItem).isUnexpected === true;
  const dragFade = 1 - Math.min(0.2, (Math.abs(dragX) + Math.abs(dragY)) / 1200);

  return (
    <motion.div
      className={cn(
        "relative z-10 h-[min(68dvh,440px)] touch-none select-none rounded-3xl border border-navy/10 bg-white shadow-2xl",
      )}
      animate={{
        x: dragX,
        y: dragY,
        rotate: rotationDeg,
        opacity: exiting ? 0 : dragFade,
      }}
      transition={
        exiting
          ? { type: "spring", stiffness: 420, damping: 32, opacity: { duration: 0.28 } }
          : { duration: 0 }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="relative h-[52%] overflow-hidden rounded-t-3xl bg-gradient-to-br from-navy/10 to-gold/10">
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
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          </>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <BadgeCheck className="h-3.5 w-3.5" />
            AI {scored.score}
          </div>
          {unexpected ? (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-navy shadow">
              Unexpected
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "pointer-events-none absolute right-3 top-3 rounded-full border-2 border-white/90 px-3 py-1 text-xs font-black tracking-wider text-white shadow",
            dragX > 40 ? "bg-emerald-500/95 opacity-100" : "opacity-0",
          )}
        >
          LIKE
        </div>
        <div
          className={cn(
            "pointer-events-none absolute left-3 top-14 rounded-full border-2 border-white/90 px-3 py-1 text-xs font-black tracking-wider text-white shadow",
            dragX < -40 ? "bg-slate-600/80 opacity-100" : "opacity-0",
          )}
        >
          PASS
        </div>
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-sm font-black tracking-widest text-white shadow-lg",
            dragY < -40 ? "opacity-100" : "opacity-0",
          )}
        >
          SUPER
        </div>
      </div>
      <div className="flex h-[48%] flex-col p-4">
        <Badge variant="secondary" className="mb-1 w-fit bg-navy/5 text-[11px] text-navy">
          {isKo ? tl.ko : tl.en}
        </Badge>
        <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-navy">
          {isKo ? m.name : m.nameEn}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
        <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{formatMediaLocationShort(m, isKo)}</span>
        </div>
        <ul className="mt-2 max-h-[4.5rem] space-y-0.5 overflow-hidden text-[11px] leading-relaxed text-navy/75">
          {scored.reasons.slice(0, 2).map((r, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-gold">·</span>
              <span className="line-clamp-2">{isKo ? r.ko : r.en}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="text-base font-bold text-navy">
            {formatMediaPriceWonWithSymbol(m.price)}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={inCompare ? "secondary" : "outline"}
              size="sm"
              className="h-8 rounded-full px-3 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare();
              }}
              disabled={disableCompare}
            >
              {inCompare ? "✓ " : ""}
              {addCompareLabel}
            </Button>
            <Link href={`/quote?media=${m.id}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" className="btn-gold h-8 rounded-full px-3 text-[11px]">
                <Calculator className="mr-1 h-3 w-3" />
                {quoteLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
