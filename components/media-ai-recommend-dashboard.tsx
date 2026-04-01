"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  LayoutList,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  Share2,
} from "lucide-react";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "@/lib/ai-recommend-metrics";
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
  onRemix: () => void;
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
  onRemix,
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
    <div className="relative space-y-10 rounded-3xl border border-navy/10 bg-gradient-to-b from-slate-900 via-navy to-slate-900 p-5 text-slate-50 shadow-2xl sm:p-7 lg:p-10">
      <div className="pointer-events-none absolute -top-5 right-8 hidden gap-1 text-lg sm:flex">
        <span className="animate-bounce text-amber-300">✦</span>
        <span className="animate-bounce text-emerald-300 delay-150">✦</span>
        <span className="animate-bounce text-sky-300 delay-300">✦</span>
      </div>
      {/* 상단 헤더 – TKAD bot 테마 */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
            <Sparkles className="h-3 w-3 text-gold" />
            <span>{isKo ? "AI 매체 탐험가 · TKAD bot" : "AI Media Explorer · TKAD bot"}</span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-gold sm:text-3xl">
            {isKo
              ? "TKAD bot의 탐험 완료! ✨"
              : "TKAD bot’s exploration complete! ✨"}
          </h2>
          <p className="max-w-xl text-sm text-slate-200 sm:text-base">
            {isKo
              ? "TKAD bot이 당신을 위해 특별히 골라온 매체들입니다! 아래 추천들을 살펴보고 캠페인에 딱 맞는 조합을 골라보세요."
              : "These are the placements TKAD bot carefully picked for your campaign. Explore them and choose the combo that feels right."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gold to-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.6)] ring-2 ring-gold/80">
            <span className="text-3xl" aria-hidden>
              🤖
            </span>
            <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-gold/90 shadow">
              TKAD bot
            </span>
          </div>
        </div>
      </header>

      {/* 상단 주요 영역: 지도 + TOP3 */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-8">
        {/* 지도 영역 */}
        <div className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-inner sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gold">
              <MapPin className="h-4 w-4 text-gold" />
              {isKo
                ? "TKAD bot이 발견한 매체 위치 🗺️"
                : "Where TKAD bot found your media 🗺️"}
            </h3>
            <p className="text-[11px] text-slate-300">
              {isKo
                ? "핀을 클릭하면 해당 매체의 핵심 정보를 바로 볼 수 있어요."
                : "Tap a pin to quickly peek at that placement’s key details."}
            </p>
          </div>
          <MediaAiRecommendMap
            locale={locale}
            items={mapItems}
            selectedId={mapSelectedId}
            onSelectId={setMapSelectedId}
            pinMetaById={pinMetaById}
            fixedMapHeightPx={Math.max(380, 400)}
          />

          {top3.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-400/25 bg-slate-950/60 px-3 py-2.5 text-[11px] text-slate-100">
              <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-emerald-200">
                <Trophy className="h-3.5 w-3.5 text-emerald-300" />
                <span>
                  {isKo
                    ? "TKAD bot의 TOP 3 강추 발견"
                    : "TKAD bot’s TOP 3 picks"}
                </span>
              </div>
              <ol className="space-y-1.5">
                {top3.map((s, i) => (
                  <li
                    key={s.item.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/80 px-2.5 py-1.5"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-200">
                        {i + 1}
                      </span>
                      <span className="line-clamp-1 text-[11px] font-semibold text-slate-50">
                        {isKo ? s.item.name : s.item.nameEn}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-emerald-200/90">
                      {isKo ? `${s.score}점 궁합` : `Match ${s.score}`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* TOP 3 – 세로 스택 카드 */}
        <div className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-inner sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gold">
            <Trophy className="h-4 w-4 text-amber-300" />
            {isKo ? "TKAD bot의 TOP 3 강추 발견 🔥" : "TKAD bot’s TOP 3 finds 🔥"}
          </h3>
          <p className="text-xs text-slate-200">
            {isKo
              ? "위에서부터 순서대로, 이번 탐험에서 가장 궁합이 좋았던 매체들이에요."
              : "From top to bottom: the three strongest matches from this run."}
          </p>
          <div className="mt-3 space-y-3">
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
        </div>
      </section>

      {/* 나머지 추천 매체 */}
      {scored.length > 3 && (
        <section className="space-y-3 rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-100 sm:text-base">
            {isKo
              ? "TKAD bot이 추가로 발견한 매체들"
              : "Other media TKAD bot discovered"}
          </h3>
          <p className="text-[11px] text-slate-300">
            {isKo
              ? "TOP 3 외에도 탐험 중 눈에 띈 매체들이에요."
              : "Beyond the TOP 3, these also stood out during exploration."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {scored.slice(3, 8).map((s) => (
              <div
                key={s.item.id}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs text-slate-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[13px] font-semibold">
                    {isKo ? s.item.name : s.item.nameEn}
                  </p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    {isKo ? `${s.score}점 궁합` : `Match ${s.score}`}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-300">
                  {formatMediaLocationShort(s.item, isKo)}
                </p>
                <dl className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                  <div>
                    <dt className="sr-only">CPM</dt>
                    <dd>
                      {isKo ? "예상 CPM" : "Est. CPM"}{" "}
                      <span className="font-semibold text-slate-50">
                        {(() => {
                          const cpm = estimatedCpmWon(s.item);
                          return cpm != null && Number.isFinite(cpm)
                            ? `₩${Math.round(cpm).toLocaleString()}`
                            : "—";
                        })()}
                      </span>
                    </dd>
                  </div>
                  <Link
                    href={mediaItemDetailPath(s.item.id)}
                    className="text-[11px] font-semibold text-gold hover:text-gold/90"
                  >
                    {isKo ? "자세히" : "Details"} →
                  </Link>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 간단 Achievement 영역 */}
      <section className="space-y-2 rounded-2xl border border-emerald-400/25 bg-slate-950/40 p-3 sm:p-4">
        <p className="text-xs font-semibold text-emerald-200">
          {isKo ? "이번 탐험으로 얻은 매디의 뱃지" : "Maddy’s achievements for this run"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
            <Sparkles className="h-3 w-3" />
            {isKo ? "첫 번째 탐험" : "First exploration"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
            <Star className="h-3 w-3" />
            {isKo ? "매체 궁합 폭발" : "Perfect match vibes"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
            <MapPin className="h-3 w-3" />
            {isKo ? "도심 탐험가" : "City explorer"}
          </span>
        </div>
      </section>

      {/* 차트 영역 – 여전히 분석적이지만 톤만 조정 */}
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Star className="h-4 w-4 text-gold" />
          {tr("resultChartTitle")}
        </h3>
        <MediaAiRecommendChart locale={locale} scored={scored} />
      </section>

      {/* 하단 액션 – 게임 결과 느낌 버튼들 */}
      <div className="flex flex-col gap-4 border-t border-gold/25 pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-full bg-gradient-to-r from-gold via-emerald-300 to-gold px-7 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(250,204,21,0.9)] ring-2 ring-emerald-300/70 hover:shadow-[0_0_55px_rgba(250,204,21,1)] sm:w-auto"
              onClick={onBackToForm}
            >
              {isKo ? "새로운 탐험 시작하기" : "Start a new exploration"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-emerald-300 bg-slate-900/70 text-emerald-100 hover:bg-slate-800 sm:w-auto"
              onClick={onRemix}
            >
              {isKo ? "조금 다르게 다시 탐험하기" : "Remix this exploration"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800 sm:w-auto"
              onClick={onViewFullList}
            >
              <LayoutList className="mr-1.5 h-4 w-4" />
              {isKo ? "전체 추천 리스트 보기" : "View full recommendation list"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800 sm:w-auto"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              {isKo ? "이 결과 공유하기" : "Share this result"}
            </Button>
          </div>
          <Link href={quoteHref}>
            <Button
              type="button"
              size="lg"
              className="w-full rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-300 sm:w-auto"
            >
              <Calculator className="mr-2 h-5 w-5" />
              {isKo ? "이 조합으로 견적 받기" : "Get a quote with these picks"}
            </Button>
          </Link>
        </div>
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

  const scoreLabel = (() => {
    if (!isKo) {
      if (scored.score >= 90) return `Match ${scored.score}/100 · on fire!`;
      if (scored.score >= 80) return `Match ${scored.score}/100 · strong fit`;
      return `Match ${scored.score}/100`;
    }
    if (scored.score >= 90) return `${scored.score}점 궁합 폭발! 🔥`;
    if (scored.score >= 80) return `${scored.score}점, 찰떡 조합이에요`;
    return `${scored.score}점 궁합`;
  })();

  const goldBadge =
    rank === 1
      ? isKo
        ? "오늘의 행운 매체"
        : "Today’s lucky pick"
      : rank === 2
        ? isKo
          ? "숨겨진 보석"
          : "Hidden gem"
        : isKo
          ? "팬덤 최적"
          : "Fandom favorite";

  const maddyTagline = (() => {
    if (!isKo) {
      if (rank === 1) {
        return "TKAD bot: This is your main hero screen — the one people will point at and say, “Ah, that campaign.” Chaltteok‑level chemistry here.";
      }
      if (rank === 2) {
        return "TKAD bot: A rock‑solid co‑star that quietly boosts reach right next to your hero slot. Think of it as your reliable partner in the route.";
      }
      return "TKAD bot: Perfect for hype‑heavy, fandom‑focused bursts and celebratory moments — this one loves buzz and fan cameras.";
    }
    if (rank === 1) {
      return "오늘 탐험의 진짜 MVP예요. 지나가는 사람들이 딱 한 번만 봐도 “아, 그 광고” 하고 기억할 메인 스포트라이트로 추천해요. 궁합 폭발! ✨";
    }
    if (rank === 2) {
      return "메인 옆에서 든든히 받쳐주는 서브 스크린이에요. 노출·가성비를 동시에 챙기고 싶을 때 ‘찰떡 조합’으로 붙이기 좋은 친구예요.";
    }
    return "팬덤·이벤트성 캠페인에 특히 강한 매체예요. 인증샷, 후기, 바이럴까지 한 번에 노릴 수 있는 숨겨진 보석 타입이라, 팬들이 모이는 날에 딱이에요.";
  })();

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-slate-700/70 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-inner",
        rankRingClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-500 text-sm font-black text-navy shadow-md">
            {rank}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            <Trophy className="h-3 w-3" />
            {tr("resultRank", { n: rank })}
          </span>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-gold">
          {goldBadge}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-slate-50">
        {isKo ? m.name : m.nameEn}
      </p>
      <p className="mt-1 text-[11px] text-slate-300">
        {isKo ? tl.ko : tl.en}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-200">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-300" />
            {tr("resultFitLabel")}
          </span>
          <span className="tabular-nums font-semibold text-amber-300">
            {scoreLabel}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-gold to-amber-500"
            style={{ width: `${Math.min(100, Math.max(0, scored.score))}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-100">
        {maddyTagline}
      </p>

      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tr("resultEstImpressions")}</dt>
          <dd className="tabular-nums font-semibold text-slate-50">
            {monthly > 0 ? monthly.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tr("resultCpmLabel")}</dt>
          <dd className="tabular-nums font-semibold text-slate-50">
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

      <p className="mt-3 flex items-start gap-1 text-[11px] text-slate-300">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gold/70" />
        <span className="line-clamp-2">
          {formatMediaLocationShort(m, isKo)}
        </span>
      </p>

      <Link
        href={mediaItemDetailPath(m.id)}
        className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-gold hover:bg-slate-700 hover:text-gold/90"
      >
        {isKo ? "상세 보기" : "Details"}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
