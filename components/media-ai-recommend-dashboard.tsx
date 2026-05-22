"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
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
  formatCatalogPriceFieldWon,
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
    <div className="border-2 border-border bg-card p-5 sm:p-7 lg:p-10">
      <div className="space-y-10">
        {/* 상단 헤더 — TKAD bot 테마 */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ {isKo ? "AI MEDIA EXPLORER · TKAD BOT" : "AI MEDIA EXPLORER · TKAD BOT"} ]
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isKo
                ? "TKAD bot의 탐험 완료!"
                : "TKAD bot's exploration complete!"}
            </h2>
            <p className="max-w-xl font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground sm:text-sm">
              {`// `}{isKo
                ? "TKAD bot이 당신을 위해 특별히 골라온 매체들입니다! 아래 추천들을 살펴보고 캠페인에 딱 맞는 조합을 골라보세요."
                : "These are the placements TKAD bot carefully picked for your campaign. Explore them and choose the combo that feels right."}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-[26px] border border-border/80 bg-card/80 text-foreground shadow-[0_28px_100px_rgba(0,0,0,0.20)] backdrop-blur">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.14),transparent_58%),linear-gradient(165deg,rgba(255,255,255,0.10)_0%,transparent_52%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid"
              />
              <span className="relative z-10 text-[34px] leading-none" aria-hidden>
                🤖
              </span>
              <span className="pointer-events-none absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-xs backdrop-blur">
                TKAD bot
              </span>
            </div>
          </div>
        </header>

        {/* 상단 주요 영역: 지도 + TOP3 */}
        <section className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* 지도 영역 */}
          <div className="space-y-3 border-2 border-border bg-card p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                [ {isKo ? "MEDIA MAP" : "MEDIA MAP"} ]
              </h3>
              <p className="font-mono text-[10px] tracking-tight text-muted-foreground">
                {`// `}{isKo
                  ? "핀을 클릭하면 해당 매체의 핵심 정보를 바로 볼 수 있어요."
                  : "Tap a pin to peek at that placement's key details."}
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
              <div className="mt-4 border-2 border-border bg-muted px-4 py-3 text-foreground">
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                  <Trophy className="h-3.5 w-3.5" />
                  [ TOP 3 PICKS ]
                </div>
                <ol className="space-y-2">
                  {top3.map((s, i) => (
                    <li
                      key={s.item.id}
                      className="flex items-center justify-between gap-2 border-t-2 border-border pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border bg-accent font-mono text-[10px] font-bold text-accent-foreground">
                          {i + 1}
                        </span>
                        <span className="line-clamp-1 text-xs font-bold tracking-tight text-foreground">
                          {isKo ? s.item.name : s.item.nameEn}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                        {isKo ? `${s.score}점` : `M${s.score}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* TOP 3 — 세로 스택 카드 */}
          <div className="-ml-[2px] -mt-[2px] space-y-3 border-2 border-border bg-muted p-5 lg:mt-0">
            <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
              <Trophy className="h-4 w-4 text-accent" />
              [ {isKo ? "TKAD BOT TOP 3" : "TKAD BOT TOP 3"} ]
            </h3>
            <p className="font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
              {`// `}{isKo
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
                />
              ))}
            </div>
          </div>
        </section>

        {/* 나머지 추천 매체 */}
        {scored.length > 3 && (
          <section className="border-2 border-border bg-card p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ MORE PICKS ]
            </p>
            <h3 className="mt-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
              {isKo
                ? "TKAD bot이 추가로 발견한 매체들"
                : "Other media TKAD bot discovered"}
            </h3>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {`// `}{isKo
                ? "TOP 3 외에도 탐험 중 눈에 띈 매체들이에요."
                : "Beyond the TOP 3, these also stood out during exploration."}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-3">
              {scored.slice(3, 8).map((s) => (
                <div
                  key={s.item.id}
                  className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
                      {isKo ? s.item.name : s.item.nameEn}
                    </p>
                    <span className="border-2 border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent-foreground">
                      {isKo ? `${s.score}점` : `M${s.score}`}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {`// `}{formatMediaLocationShort(s.item, isKo)}
                  </p>
                  <dl className="mt-3 flex items-center justify-between border-t-2 border-border pt-3 font-mono text-[11px] tracking-tight text-muted-foreground">
                    <div>
                      <dt className="sr-only">CPM</dt>
                      <dd>
                        {isKo ? "예상 CPM" : "Est. CPM"}{" "}
                        <span className="font-bold text-foreground">
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
                      className="font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-accent"
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
        <section className="border-2 border-accent bg-card p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ ACHIEVEMENTS ]
          </p>
          <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
            {isKo ? "TKAD Bot의 탐험 결과" : "Maddy's achievements for this run"}
          </p>
          <div className="mt-3 flex flex-wrap gap-0">
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              {isKo ? "첫 번째 탐험" : "First exploration"}
            </span>
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
              <Star className="h-3 w-3 text-accent" />
              {isKo ? "매체 궁합 폭발" : "Perfect match vibes"}
            </span>
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
              <MapPin className="h-3 w-3 text-accent" />
              {isKo ? "도심 탐험가" : "City explorer"}
            </span>
          </div>
        </section>

        {/* 차트 영역 */}
        <section className="border-2 border-border bg-card p-5">
          <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
            <Star className="h-4 w-4 text-accent" />
            [ {tr("resultChartTitle")} ]
          </h3>
          <div className="mt-3 grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-muted p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ {isKo ? "읽는 법" : "How to read"} ]
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-foreground">
                <li>
                  - {isKo ? "오른쪽일수록 추천 점수가 높아요." : "Further right = higher fit score."}
                </li>
                <li>
                  - {isKo ? "위로 갈수록 월간 노출(추정)이 커요." : "Higher up = more estimated monthly reach."}
                </li>
                <li>
                  - {isKo ? "오른쪽 위에 몰릴수록 유리해요." : "Top-right cluster is generally better."}
                </li>
              </ul>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ {isKo ? "어려운 용어" : "Terms"} ]
              </p>
              <dl className="mt-2 space-y-2 text-sm text-foreground">
                <div>
                  <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                    {isKo ? "추천 점수" : "Fit score"}
                  </dt>
                  <dd className="text-muted-foreground">
                    {isKo ? "조건(목표·지역·예산·타깃)과의 매칭 정도(0–100)" : "How well it matches your inputs (0–100)."}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                    {isKo ? "월간 노출(추정)" : "Est. monthly reach"}
                  </dt>
                  <dd className="text-muted-foreground">
                    {isKo ? "서로 간 상대 비교용(정확한 실측이 아닐 수 있음)" : "For relative comparison (may not be measured)."}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ {isKo ? "빠른 팁" : "Quick tip"} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isKo
                  ? "차트는 ‘완벽한 답’이 아니라 후보를 빠르게 좁히기 위한 지도예요. TOP 3부터 보고, 마음에 드는 매체를 비교/견적으로 이어가세요."
                  : "This chart helps you narrow options quickly. Start with TOP 3, then compare and request a quote."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <MediaAiRecommendChart locale={locale} scored={scored} />
          </div>
        </section>

        {/* 하단 액션 */}
        <div className="flex flex-col gap-4 border-t-2 border-border pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <BtnBlock
                variant="accent"
                size="md"
                onClick={onBackToForm}
                className="w-full sm:w-auto"
              >
                {isKo ? "새로운 탐험 시작" : "New exploration"}
              </BtnBlock>
              <BtnBlock
                variant="primary"
                size="md"
                onClick={onRemix}
                className="w-full sm:w-auto"
              >
                {isKo ? "다시 탐험" : "Remix"}
              </BtnBlock>
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={onViewFullList}
                className="w-full sm:w-auto"
              >
                <LayoutList className="h-4 w-4" />
                {isKo ? "전체 추천 리스트" : "Full list"}
              </BtnBlock>
              <BtnBlock
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
              >
                <Share2 className="h-4 w-4" />
                {isKo ? "공유" : "Share"}
              </BtnBlock>
            </div>
            <BtnBlock
              href={quoteHref}
              variant="accent"
              size="md"
              className="w-full sm:w-auto"
            >
              <Calculator className="h-5 w-5" />
              {isKo ? "이 조합으로 견적" : "Get a quote"}
            </BtnBlock>
          </div>
        </div>
      </div>
    </div>
  );
}

function Top3DashCard({
  scored,
  rank,
  isKo,
}: {
  scored: ScoredMedia;
  rank: number;
  isKo: boolean;
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
    if (scored.score >= 90) return `${scored.score}점 궁합 폭발!`;
    if (scored.score >= 80) return `${scored.score}점, 찰떡 조합이에요`;
    return `${scored.score}점 궁합`;
  })();

  const goldBadge =
    rank === 1
      ? isKo
        ? "오늘의 행운 매체"
        : "Today's lucky pick"
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
        return "TKAD bot: This is your main hero screen — the one people will point at and say, \"Ah, that campaign.\" Chaltteok-level chemistry here.";
      }
      if (rank === 2) {
        return "TKAD bot: A rock-solid co-star that quietly boosts reach right next to your hero slot. Think of it as your reliable partner in the route.";
      }
      return "TKAD bot: Perfect for hype-heavy, fandom-focused bursts and celebratory moments — this one loves buzz and fan cameras.";
    }
    if (rank === 1) {
      return "오늘 탐험의 진짜 MVP예요. 지나가는 사람들이 딱 한 번만 봐도 \"아, 그 광고\" 하고 기억할 메인 스포트라이트로 추천해요. 궁합 폭발!";
    }
    if (rank === 2) {
      return "메인 옆에서 든든히 받쳐주는 서브 스크린이에요. 노출·가성비를 동시에 챙기고 싶을 때 '찰떡 조합'으로 붙이기 좋은 친구예요.";
    }
    return "팬덤·이벤트성 캠페인에 특히 강한 매체예요. 인증샷, 후기, 바이럴까지 한 번에 노릴 수 있는 숨겨진 보석 타입이라, 팬들이 모이는 날에 딱이에요.";
  })();

  const accentRank = rank === 1;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[24px] border-2 border-border bg-card p-4",
        accentRank &&
          "dark:border-white/14 border-gray-200 bg-white text-gray-900 shadow-sm dark:bg-[#05050a] dark:text-white dark:shadow-[0_28px_120px_rgba(0,0,0,0.55)] shadow-[0_28px_120px_rgba(0,0,0,0.55)]",
      )}
    >
      {accentRank ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 tkad-neon-depth" />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-25 tkad-neon-grid" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 tkad-hero-noise opacity-[0.08] mix-blend-overlay"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(165deg,rgba(168,85,247,0.24)_0%,rgba(34,211,238,0.08)_40%,rgba(236,72,153,0.10)_100%)]"
          />
        </>
      ) : null}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center font-mono text-sm font-black",
                accentRank
                  ? "rounded-full border border-white/22 bg-white/12 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur"
                  : "border-2 border-border bg-accent text-accent-foreground",
              )}
            >
              {rank}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.18em]",
                accentRank
                  ? "rounded-xl border border-white/22 dark:bg-black bg-white/25 dark:text-white text-gray-900 backdrop-blur"
                  : "border-2 border-border bg-hero-void text-accent",
              )}
            >
              <Trophy className="h-3 w-3" />
              {tr("resultRank", { n: rank })}
            </span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.18em]",
              accentRank
                ? "rounded-xl border border-white/22 dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur"
                : "border-2 border-accent bg-accent text-accent-foreground",
            )}
          >
            {goldBadge}
          </span>
        </div>
      <p
        className={cn(
          "mt-3 line-clamp-2 text-sm font-bold leading-snug tracking-tight",
          accentRank ? "dark:text-white text-gray-900" : "text-foreground",
        )}
      >
        {isKo ? m.name : (m.nameEn || m.name)}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-[11px] uppercase tracking-[0.18em]",
          accentRank ? "dark:text-white text-gray-700" : "text-muted-foreground",
        )}
      >
        [ {isKo ? tl.ko : tl.en} ]
      </p>

      <div className="mt-3 space-y-1.5">
        <div
          className={cn(
            "flex items-center justify-between gap-2 font-mono text-[11px] tracking-tight",
            accentRank ? "dark:text-white text-gray-800" : "text-muted-foreground",
          )}
        >
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            {tr("resultFitLabel")}
          </span>
          <span
            className={cn(
              "tabular-nums font-bold",
              accentRank ? "dark:text-white text-gray-900" : "text-accent",
            )}
          >
            {scoreLabel}
          </span>
        </div>
        <div
          className={cn(
            "h-3 w-full border-2",
            accentRank
              ? "dark:border-white/18 border-gray-300 dark:bg-black bg-white/20"
              : "border-border bg-card",
          )}
        >
          <div
            className={cn(
              "h-full",
              accentRank
                ? "bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]"
                : "bg-accent",
            )}
            style={{ width: `${Math.min(100, Math.max(0, scored.score))}%` }}
          />
        </div>
      </div>

      <p
        className={cn(
          "mt-3 font-mono text-[11px] leading-relaxed tracking-tight",
          accentRank ? "dark:text-white text-gray-800" : "text-muted-foreground",
        )}
      >
        {`// `}{maddyTagline}
      </p>

      <dl
        className={cn(
          "mt-4 space-y-2 border-t-2 pt-3 font-mono text-xs",
          accentRank ? "dark:border-white/18 border-gray-300" : "border-border",
        )}
      >
        <div className="flex justify-between gap-2">
          <dt className={accentRank ? "dark:text-white text-gray-600" : "text-muted-foreground"}>
            {tr("resultEstImpressions")}
          </dt>
          <dd
            className={cn(
              "tabular-nums font-bold",
              accentRank ? "dark:text-white text-gray-900" : "text-foreground",
            )}
          >
            {monthly > 0 ? monthly.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={accentRank ? "dark:text-white text-gray-600" : "text-muted-foreground"}>
            {tr("resultCpmLabel")}
          </dt>
          <dd
            className={cn(
              "tabular-nums font-bold",
              accentRank ? "dark:text-white text-gray-900" : "text-foreground",
            )}
          >
            {cpm != null && Number.isFinite(cpm)
              ? `₩${Math.round(cpm).toLocaleString()}`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={accentRank ? "dark:text-white text-gray-600" : "text-muted-foreground"}>
            {isKo ? "가격" : "Price"}
          </dt>
          <dd
            className={cn(
              "tabular-nums font-bold",
              accentRank ? "dark:text-white text-gray-900" : "text-foreground",
            )}
          >
            {formatCatalogPriceFieldWon(m.price)}
            <span
              className={cn(
                "ml-1 text-[10px] font-normal",
                accentRank ? "dark:text-white text-gray-500" : "text-muted-foreground",
              )}
            >
              · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
            </span>
          </dd>
        </div>
      </dl>

      <p
        className={cn(
          "mt-3 flex items-start gap-1 font-mono text-[11px] uppercase tracking-[0.18em]",
          accentRank ? "dark:text-white text-gray-700" : "text-muted-foreground",
        )}
      >
        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="line-clamp-2">
          {formatMediaLocationShort(m, isKo)}
        </span>
      </p>

      <Link
        href={mediaItemDetailPath(m.id)}
        className={cn(
          "mt-4 inline-flex w-fit items-center gap-1 border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
          accentRank
            ? "border-white/22 dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 backdrop-blur hover:border-white/30 hover:bg-white/16"
            : "border-border bg-card text-foreground hover:bg-foreground hover:text-background",
        )}
      >
        {isKo ? "상세 보기" : "Details"}
        <span aria-hidden>→</span>
      </Link>
      </div>
    </div>
  );
}
