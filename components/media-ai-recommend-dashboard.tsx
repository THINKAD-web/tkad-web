"use client";

import { useMemo, useState } from "react";
import { BtnBlock } from "@/components/brutalist";
import { Link } from "@/i18n/navigation";
import {
  Calculator,
  ChevronDown,
  FileText,
  LayoutList,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  Lightbulb,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput, ScoredMedia } from "@/lib/ai-media-recommend";
import type { RegionCheckboxCode } from "@/components/media-ai-recommend-form";
import type { RecommendMatchMeta } from "@/lib/recommend/recommend-region-filter";
import { cn } from "@/lib/utils";
import MediaAiRecommendMap from "@/components/media-ai-recommend-map";
import MediaAiRecommendChart from "@/components/media-ai-recommend-chart";
import {
  RECOMMEND_MEDIA_GRID_CLASS,
  RecommendScoredMediaCard,
  RecommendTop3PickRow,
} from "@/components/media-ai-recommend-scored-card";
import { rationaleLinesForLocale } from "@/lib/recommendation-adapters";
import { RecommendationAxisTabs } from "@/components/recommendation/recommendation-axis-tabs";
import { RecommendReportSection } from "@/components/recommend/recommend-report-section";
import { PlanCartBulkAddButton } from "@/components/plan/plan-cart-bulk-add-button";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";

type Props = {
  locale: string;
  scored: readonly ScoredMedia[];
  top3: readonly ScoredMedia[];
  onBackToForm: () => void;
  onViewFullList: () => void;
  onRemix: () => void;
  onRequestQuote?: () => void;
  onCreateQuote?: () => void;
  creatingQuote?: boolean;
  quoteBusy?: boolean;
  renderQuantityControl?: (media: MediaItem) => React.ReactNode;
  /** 견적·플랜 추가 대상 — 미지정 시 전체 scored */
  planAddItems?: readonly MediaItem[];
  catalog: readonly MediaItem[];
  recommendInput: AiRecommendInput;
  regionCodes: readonly RegionCheckboxCode[];
  analysisSeed?: number;
  reportPortfolio?: readonly MediaItem[];
  reportScoredPortfolio?: readonly ScoredMedia[];
  matchedCount?: number;
  matchedPool?: readonly MediaItem[];
  recommendQuantities?: CampaignMediaQuantities;
  recommendPriceOptionIndex?: CampaignMediaPriceOptionIndex;
  regionMeta?: RecommendMatchMeta | null;
  onOpenMediaBrowse?: () => void;
};

export default function MediaAiRecommendDashboard({
  locale,
  scored,
  top3,
  onBackToForm,
  onViewFullList,
  onRemix,
  onRequestQuote,
  onCreateQuote,
  creatingQuote = false,
  quoteBusy = false,
  renderQuantityControl,
  planAddItems,
  catalog,
  recommendInput,
  regionCodes,
  analysisSeed = 0,
  reportPortfolio,
  reportScoredPortfolio,
  matchedCount = 0,
  matchedPool,
  recommendQuantities = {},
  recommendPriceOptionIndex = {},
  regionMeta = null,
  onOpenMediaBrowse,
}: Props) {
  const isKo = locale === "ko";
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);

  const mapItems = useMemo(
    () => scored.map((s) => s.item),
    [scored],
  );

  const planBulkItems = useMemo(
    () =>
      (planAddItems ?? scored.map((s) => s.item)).map((item) =>
        planCartItemFromMediaItem(item, "ai_recommend"),
      ),
    [planAddItems, scored],
  );

  const portfolioForReport = useMemo(
    () => [...(reportPortfolio ?? planAddItems ?? top3.map((s) => s.item))],
    [reportPortfolio, planAddItems, top3],
  );

  const scoredForReport = useMemo(() => {
    if (reportScoredPortfolio?.length) return [...reportScoredPortfolio];
    const byId = new Map(scored.map((s) => [s.item.id, s]));
    return portfolioForReport
      .map((item) => byId.get(item.id))
      .filter((s): s is ScoredMedia => s != null);
  }, [reportScoredPortfolio, scored, portfolioForReport]);

  const poolForReport = useMemo(
    () => [...(matchedPool ?? scored.map((s) => s.item))],
    [matchedPool, scored],
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
    <div className="overflow-x-clip border-2 border-border bg-card p-5 sm:p-7 lg:p-10">
      <div className="space-y-10">
        {regionMeta?.regionSupplemented ? (
          <p className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-100">
            {isKo
              ? `선택 지역 매체가 ${regionMeta.regionalCatalogCount}건뿐이라, 조건에 맞는 전국 매체를 일부 보완했습니다.`
              : `Only ${regionMeta.regionalCatalogCount} placements matched your region — we added some nationwide options.`}
          </p>
        ) : null}

        {/* 상단 헤더 — TKAD bot 테마 */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
              [ {isKo ? "AI MEDIA EXPLORER · TKAD BOT" : "AI MEDIA EXPLORER · TKAD BOT"} ]
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isKo
                ? "TKAD bot의 탐험 완료!"
                : "TKAD bot's exploration complete!"}
            </h2>
            <p className="max-w-xl text-[12px] leading-relaxed tracking-tight text-muted-foreground sm:text-sm">
              {`// `}{isKo
                ? "TKAD bot이 골라온 매체입니다. 여기서 견적·상담까지 완료할 수 있어요."
                : "Placements TKAD bot picked for you. Finish with a quote or expert consult here."}
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
              <span className="pointer-events-none absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 font-display text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-xs backdrop-blur">
                TKAD bot
              </span>
            </div>
          </div>
        </header>

        {/* 상단 주요 영역: 지도(전폭) + TOP3(가로 그리드) */}
        <section className="space-y-6">
          {/* 지도 영역 */}
          <div className="space-y-3 border-2 border-border bg-card p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                [ {isKo ? "MEDIA MAP" : "MEDIA MAP"} ]
              </h3>
              <p className="text-[10px] tracking-tight text-muted-foreground">
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
                <div className="mb-2 flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                  <Trophy className="h-3.5 w-3.5" />
                  [ TOP 3 PICKS ]
                </div>
                <ol className="space-y-2">
                  {top3.map((s, i) => {
                    const summary =
                      rationaleLinesForLocale(
                        s.rationaleLines ?? s.reasons.map((r) => ({
                          ko: r.ko,
                          en: r.en,
                        })),
                        locale,
                      )[0] ?? "";
                    const name = isKo ? s.item.name : s.item.nameEn || s.item.name;
                    return (
                      <li
                        key={s.item.id}
                        className="border-t-2 border-border pt-2 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex min-w-0 flex-1 items-start gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border bg-accent text-[10px] font-bold text-accent-foreground">
                              {i + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-1 text-xs font-bold tracking-tight text-foreground">
                                {name}
                              </span>
                              {summary ? (
                                <span className="mt-1 block space-y-0.5">
                                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                                    <Lightbulb className="h-3 w-3 shrink-0" aria-hidden />
                                    {isKo ? "추천 이유" : "Why"}
                                  </span>
                                  <span className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
                                    {summary}
                                  </span>
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
                            {isKo ? `${s.score}점` : `M${s.score}`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          {/* TOP 3 — 좁은 사이드 컬럼 대신 반응형 가로 그리드 */}
          <div className="space-y-4 border-2 border-border bg-muted p-5 sm:p-6">
            <div>
              <h3 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
                <Trophy className="h-4 w-4 text-accent" />
                [ {isKo ? "TKAD BOT TOP 3" : "TKAD BOT TOP 3"} ]
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed tracking-tight text-muted-foreground sm:text-xs">
                {`// `}{isKo
                  ? "왼쪽부터 순서대로, 이번 탐험에서 가장 궁합이 좋았던 매체들이에요."
                  : "Left to right: the three strongest matches from this run."}
              </p>
            </div>
            <ul className={RECOMMEND_MEDIA_GRID_CLASS}>
              {top3.map((s, i) => (
                <RecommendScoredMediaCard
                  key={s.item.id}
                  scored={s}
                  rank={i + 1}
                  isKo={isKo}
                  locale={locale}
                  rationaleTwoLine
                  quantityControl={renderQuantityControl?.(s.item)}
                />
              ))}
            </ul>
          </div>
        </section>

        <RecommendationAxisTabs
          variant="recommend"
          catalog={[...catalog]}
          input={recommendInput}
          regionCodes={regionCodes}
          isKo={isKo}
          locale={locale}
          seed={analysisSeed}
          renderQuantityControl={renderQuantityControl}
        />

        {/* 간단 Achievement 영역 */}
        <section className="border-2 border-accent bg-card p-5">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            [ ACHIEVEMENTS ]
          </p>
          <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
            {isKo ? "TKAD Bot의 탐험 결과" : "Maddy's achievements for this run"}
          </p>
          <div className="mt-3 flex flex-wrap gap-0">
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              {isKo ? "첫 번째 탐험" : "First exploration"}
            </span>
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
              <Star className="h-3 w-3 text-accent" />
              {isKo ? "매체 궁합 폭발" : "Perfect match vibes"}
            </span>
            <span className="-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
              <MapPin className="h-3 w-3 text-accent" />
              {isKo ? "도심 탐험가" : "City explorer"}
            </span>
          </div>
        </section>

        {/* 산점도 — 접이식(기본 접힘) */}
        <section className="border-2 border-border bg-card">
          <button
            type="button"
            onClick={() => setChartOpen((o) => !o)}
            aria-expanded={chartOpen}
            className="flex w-full items-center justify-between gap-3 p-5 text-left"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
                <Star className="mr-2 inline h-4 w-4 text-accent" aria-hidden />
                [ {isKo ? "전체 분포 보기" : "Full distribution"} ]
              </span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                {isKo
                  ? "추천 점수·월간 노출 산점도 — 필요할 때만 펼쳐 보세요."
                  : "Fit score vs. estimated reach — expand when you need the big picture."}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                chartOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {chartOpen ? (
            <div className="border-t-2 border-border px-5 pb-5 pt-4">
              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-muted p-4">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
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
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    [ {isKo ? "어려운 용어" : "Terms"} ]
                  </p>
                  <dl className="mt-2 space-y-2 text-sm text-foreground">
                    <div>
                      <dt className="font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                        {isKo ? "추천 점수" : "Fit score"}
                      </dt>
                      <dd className="text-muted-foreground">
                        {isKo ? "조건(목표·지역·예산·타깃)과의 매칭 정도(0–100)" : "How well it matches your inputs (0–100)."}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                        {isKo ? "월간 노출(추정)" : "Est. monthly reach"}
                      </dt>
                      <dd className="text-muted-foreground">
                        {isKo ? "서로 간 상대 비교용(정확한 실측이 아닐 수 있음)" : "For relative comparison (may not be measured)."}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    [ {isKo ? "빠른 팁" : "Quick tip"} ]
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {isKo
                      ? "차트는 ‘완벽한 답’이 아니라 후보를 빠르게 좁히기 위한 지도예요. 축별 탭과 TOP 3를 먼저 보세요."
                      : "Use this chart to narrow options — start with axis tabs and TOP 3."}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <MediaAiRecommendChart locale={locale} scored={scored} />
              </div>
            </div>
          ) : null}
        </section>

        <RecommendReportSection
          isKo={isKo}
          locale={locale}
          input={recommendInput}
          regionCodes={regionCodes}
          portfolio={portfolioForReport}
          scoredPortfolio={scoredForReport}
          matchedCount={matchedCount || scored.length}
          quantities={recommendQuantities}
          priceOptionIndex={recommendPriceOptionIndex}
          matchedPool={poolForReport}
        />

        {/* 하단 액션 */}
        <div className="flex flex-col gap-4 border-t-2 border-border pt-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <BtnBlock
              variant="accent"
              size="lg"
              className="w-full flex-1 sm:w-auto"
              onClick={onCreateQuote}
              disabled={!onCreateQuote || creatingQuote}
            >
              <FileText className="h-5 w-5" />
              {creatingQuote
                ? isKo
                  ? "견적서 생성 중…"
                  : "Creating quote…"
                : isKo
                  ? "견적서 만들기"
                  : "Create quote"}
            </BtnBlock>
            <PlanCartBulkAddButton
              items={planBulkItems}
              label={isKo ? "선택 매체 플랜에 추가" : "Add selected to plan"}
              size="lg"
              className="w-full flex-1 sm:w-auto"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/planner"
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              {isKo ? "플래너에서 상세 설계" : "Design in step-by-step planner"}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenMediaBrowse ? (
              <BtnBlock
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={onOpenMediaBrowse}
              >
                <MapPin className="h-4 w-4" />
                {isKo ? "매체 더 찾기 · 추가" : "Find & add media"}
              </BtnBlock>
            ) : null}
            <BtnBlock
              variant="secondary"
              size="sm"
              onClick={onViewFullList}
              className="w-full sm:w-auto"
            >
              <LayoutList className="h-4 w-4" />
              {isKo ? "전체 추천 리스트" : "Full list"}
            </BtnBlock>
            <BtnBlock
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onRequestQuote}
              disabled={!onRequestQuote || quoteBusy}
            >
              <Calculator className="h-4 w-4" />
              {quoteBusy
                ? isKo
                  ? "이동 중…"
                  : "Opening…"
                : isKo
                  ? "전문가 상담 받기"
                  : "Talk to an expert"}
            </BtnBlock>
            <BtnBlock
              variant="secondary"
              size="sm"
              onClick={onRemix}
              className="w-full sm:w-auto"
            >
              {isKo ? "다른 후보 보기" : "See other picks"}
            </BtnBlock>
          </div>

          <button
            type="button"
            onClick={onBackToForm}
            className="self-start text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {isKo ? "조건 수정" : "Edit criteria"}
          </button>
        </div>
      </div>
    </div>
  );
}
