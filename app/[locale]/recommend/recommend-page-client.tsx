"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/components/toast-provider";
import { motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { DISCOVERY_TABS } from "@/lib/navigation/sub-page-tabs";
import MediaAiRecommendForm, {
  type MediaAiRecommendFormSubmit,
} from "@/components/media-ai-recommend-form";
import MediaAiRecommendDashboard from "@/components/media-ai-recommend-dashboard";
import type { MediaItem } from "@/lib/media-data";
import { matchesMediaTextQuery } from "@/lib/media-data";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import {
  recommendMedia,
  filterCatalogByRegionCodes,
  type AiRecommendInput,
} from "@/lib/ai-media-recommend";
import type { RegionCheckboxCode } from "@/components/media-ai-recommend-form";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "@/lib/ai-recommend-metrics";
import { savePlanTransferData } from "@/lib/planner-contact-transfer";
import {
  buildHomeBudgetRecommendInput,
  type HomeBudgetIndustry,
  type HomeBudgetRegion,
} from "@/lib/home-budget-recommend";
import { TurnstileWidget } from "@/components/turnstile";
import {
  RECOMMEND_MEDIA_GRID_CLASS,
  RecommendScoredMediaCard,
  RecommendTop3PickRow,
} from "@/components/media-ai-recommend-scored-card";

const RecommendCartBar = dynamic(
  () => import("@/components/recommend-cart-bar"),
  { ssr: false },
);

const CART_MAX = 12;

type Phase = "form" | "loading" | "dashboard" | "noResults" | "list";

export default function RecommendPageClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const tr = useTranslations("recommend");
  const { toast } = useToast();
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const similarCampaignId = searchParams.get("similar")?.trim() ?? "";
  const similarPrefillDone = useRef<string | null>(null);
  const homeBudgetAutoDone = useRef(false);
  const budgetFromUrl = searchParams.get("budget");
  const regionFromUrl = searchParams.get("region") as HomeBudgetRegion | null;
  const industryFromUrl = searchParams.get("industry") as HomeBudgetIndustry | null;
  const autoFromUrl = searchParams.get("auto");

  const [cartItems, setCartItems] = useState<MediaItem[]>([]);
  const [similarBanner, setSimilarBanner] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [fullList, setFullList] = useState<ScoredMedia[] | null>(null);
  const [lastPayload, setLastPayload] =
    useState<MediaAiRecommendFormSubmit | null>(null);
  const [analysisSeed, setAnalysisSeed] = useState(0);
  const [recommendLogId, setRecommendLogId] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const router = useRouter();
  const [navigatingQuote, setNavigatingQuote] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const handledCreateQuoteRef = useRef(false);

  const top3 = useMemo(() => {
    if (!fullList?.length) return [];
    return fullList.slice(0, 3);
  }, [fullList]);

  const quoteQueryPicked =
    cartItems.length > 0
      ? cartItems.map((m) => m.id).join(",")
      : top3.map((s) => s.item.id).join(",");

  const quoteHref = `/quote?media=${encodeURIComponent(quoteQueryPicked)}`;

  const goToContactQuote = useCallback(() => {
    const picked =
      cartItems.length > 0 ? cartItems : top3.map((s) => s.item);
    if (picked.length === 0) {
      toast(
        "error",
        isKo ? "추천 매체가 없습니다." : "No recommendations yet.",
      );
      return;
    }
    const duration = lastPayload?.input.preferredPeriodWeeks
      ? Math.max(1, Math.round(lastPayload.input.preferredPeriodWeeks / 4))
      : 1;
    const monthlyWon = picked.reduce((s, m) => s + (m.price || 0), 0);
    const estimatedReach =
      picked.reduce((s, m) => s + estimatedMonthlyImpressions(m), 0) *
      duration;
    const cpmValues = picked
      .map((m) => estimatedCpmWon(m))
      .filter((v): v is number => v != null && Number.isFinite(v));
    const estimatedCpm =
      cpmValues.length > 0
        ? cpmValues.reduce((a, b) => a + b, 0) / cpmValues.length
        : undefined;

    savePlanTransferData({
      mediaIds: picked.map((m) => m.id),
      mediaNames: picked.map((m) =>
        isKo ? m.name : m.nameEn || m.name,
      ),
      totalBudget: monthlyWon * duration,
      duration,
      region: lastPayload?.regionCodes.join(", ") || undefined,
      goal: lastPayload?.input.goal,
      estimatedReach,
      estimatedCpm,
      source: "ai_recommend",
    });
    setNavigatingQuote(true);
    router.push("/contact?from=ai");
    setNavigatingQuote(false);
  }, [cartItems, top3, lastPayload, isKo, router, toast]);

  /**
   * 추천 결과로 견적서를 직접 생성하고 미리보기로 이동.
   * 비로그인 시 매체 ID 를 redirect 에 실어 로그인 후 `?createQuote=<ids>` 로 복귀해 생성을 재개.
   */
  const createQuoteFromRecommend = useCallback(
    async (idsOverride?: string[]) => {
      if (creatingQuote) return;
      const picked =
        idsOverride && idsOverride.length > 0
          ? catalog.filter((m) => idsOverride.includes(m.id))
          : cartItems.length > 0
            ? cartItems
            : top3.map((s) => s.item);
      if (picked.length === 0) {
        toast(
          "error",
          isKo ? "추천 매체가 없습니다." : "No recommendations yet.",
        );
        return;
      }

      setCreatingQuote(true);
      try {
        let user:
          | { name?: string; email?: string; company?: string | null }
          | null = null;
        try {
          const sessionRes = await fetch("/api/auth/session", {
            cache: "no-store",
          });
          const sessionData = await sessionRes.json();
          if (sessionData?.ok && sessionData.data?.email) {
            user = sessionData.data;
          }
        } catch {
          /* ignore */
        }

        if (!user?.email) {
          const ids = picked.map((m) => m.id).join(",");
          toast(
            "info",
            isKo
              ? "견적서 생성을 위해 로그인이 필요합니다. 로그인 후 이어서 진행됩니다."
              : "Please sign in to generate a quote — we'll resume right after.",
          );
          router.push(
            `/login?redirect=${encodeURIComponent(`/recommend?createQuote=${ids}`)}`,
          );
          return;
        }

        const duration = lastPayload?.input.preferredPeriodWeeks
          ? Math.max(
              1,
              Math.round(lastPayload.input.preferredPeriodWeeks / 4),
            )
          : 1;
        const period = isKo
          ? `${duration}개월`
          : `${duration} month${duration > 1 ? "s" : ""}`;
        const totalBudgetWon =
          picked.reduce((s, m) => s + (m.price || 0), 0) * duration;

        const res = await fetch("/api/quote/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaIds: picked.map((m) => m.id),
            clientName: user.name || user.email,
            clientEmail: user.email,
            clientCompany: user.company || undefined,
            period,
            budgetMax: totalBudgetWon > 0 ? totalBudgetWon : undefined,
            locale: isKo ? "ko" : "en",
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          data?: { id?: string };
        };
        if (!res.ok || !data?.ok || !data.data?.id) {
          throw new Error("quote create failed");
        }
        router.push(`/quote/${data.data.id}/preview`);
      } catch (e) {
        console.error("[recommend.createQuote] error", e);
        toast(
          "error",
          isKo
            ? "견적서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
            : "Could not create the quote. Please try again.",
        );
        setCreatingQuote(false);
      }
    },
    [cartItems, top3, catalog, lastPayload, creatingQuote, isKo, router, toast],
  );

  // 로그인 후 `?createQuote=<ids>` 로 복귀하면 해당 매체로 견적 생성을 재개.
  useEffect(() => {
    const param = searchParams.get("createQuote");
    if (!param) return;
    if (handledCreateQuoteRef.current) return;
    handledCreateQuoteRef.current = true;
    const ids = param.split(",").map((s) => s.trim()).filter(Boolean);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("createQuote");
      window.history.replaceState({}, "", url.toString());
    }
    if (ids.length > 0) void createQuoteFromRecommend(ids);
  }, [searchParams, createQuoteFromRecommend]);

  const runAnalysis = useCallback(
    async (payload: MediaAiRecommendFormSubmit, seed = 0) => {
      setPhase("loading");
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: payload.input,
            seed,
            limit: 30,
            locale,
            useClaude: true,
            turnstileToken: captchaToken || undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          items?: Array<{
            mediaId: string;
            score: number;
            reasons: { ko: string; en: string }[];
            oneLine?: string;
          }>;
          logId?: string;
        };

        if (data.ok && data.items?.length) {
          const byId = new Map(catalog.map((m) => [m.id, m]));
          const scored: ScoredMedia[] = [];
          for (const item of data.items) {
            const media = byId.get(item.mediaId);
            if (!media) continue;
            scored.push({
              item: media,
              score: item.score,
              reasons: item.reasons?.length ?
                item.reasons
              : [
                  {
                    ko: item.oneLine ?? "조건 기반 추천",
                    en: item.oneLine ?? "Rule-based match",
                  },
                ],
            });
          }
          setRecommendLogId(data.logId ?? null);
          setFullList(scored);
          setPhase(scored.length > 0 ? "dashboard" : "noResults");
          return;
        }

        /** API 실패 시 클라이언트 폴백 (동일 카탈로그·결정론적) */
        const poolRegion = filterCatalogByRegionCodes(
          catalog,
          payload.regionCodes,
        );
        const q = payload.searchQuery.trim().toLowerCase();
        const poolFiltered =
          q.length > 0 ?
            poolRegion.filter((m) => matchesMediaTextQuery(m, q))
          : poolRegion;
        const baseCatalog =
          poolFiltered.length > 0 ? poolFiltered : catalog;
        const paddingSource = poolRegion.length > 0 ? poolRegion : catalog;
        let scored = recommendMedia(payload.input, baseCatalog, paddingSource);
        if (scored.length === 0 && q.length > 0 && poolRegion.length > 0) {
          scored = recommendMedia(payload.input, poolRegion, paddingSource);
        }
        setFullList(scored);
        setPhase(scored.length > 0 ? "dashboard" : "noResults");
      } catch (e) {
        console.error("[recommend] runAnalysis", e);
        setFullList(null);
        setPhase("form");
        toast("error", tr("analysisFailed"));
      }
    },
    [catalog, toast, tr, locale],
  );

  const handleFormSubmit = useCallback(
    (payload: MediaAiRecommendFormSubmit) => {
      setLastPayload(payload);
      runAnalysis(payload);
    },
    [runAnalysis],
  );

  useEffect(() => {
    if (
      autoFromUrl !== "1" ||
      homeBudgetAutoDone.current ||
      !budgetFromUrl ||
      !regionFromUrl
    ) {
      return;
    }
    const budgetMan = Number.parseInt(budgetFromUrl, 10);
    if (!Number.isFinite(budgetMan) || budgetMan < 100) return;
    homeBudgetAutoDone.current = true;

    const validRegions: HomeBudgetRegion[] = [
      "gangnam",
      "hongdae",
      "seongsu",
      "downtown",
      "national",
    ];
    const region = validRegions.includes(regionFromUrl)
      ? regionFromUrl
      : "national";
    const industry = industryFromUrl ?? "";
    const input = buildHomeBudgetRecommendInput(budgetMan, region, industry);
    const regionCodes: RegionCheckboxCode[] =
      region === "national" ? [] : ["seoul"];

    const payload: MediaAiRecommendFormSubmit = {
      input,
      regionCodes,
      searchQuery: "",
    };
    setLastPayload(payload);
    runAnalysis(payload);
  }, [
    autoFromUrl,
    budgetFromUrl,
    regionFromUrl,
    industryFromUrl,
    runAnalysis,
  ]);

  useEffect(() => {
    if (!similarCampaignId || similarPrefillDone.current === similarCampaignId) {
      return;
    }
    similarPrefillDone.current = similarCampaignId;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/my/dashboard/campaigns/${encodeURIComponent(similarCampaignId)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          data?: {
            name?: string;
            mediaIds?: string[];
            startDate?: string | null;
            endDate?: string | null;
          };
        };
        if (cancelled || !res.ok || !json.ok || !json.data) return;

        const { name, mediaIds = [], startDate, endDate } = json.data;
        const idSet = new Set(mediaIds);
        const matched = catalog.filter((m) => idSet.has(m.id));
        if (matched.length > 0) {
          setCartItems(matched.slice(0, CART_MAX));
        }

        const period =
          startDate && endDate
            ? isKo
              ? `${startDate} ~ ${endDate}`
              : `${startDate} – ${endDate}`
            : null;
        setSimilarBanner(
          isKo
            ? `「${name ?? "캠페인"}」과 유사한 매체를 추천합니다.${period ? ` (이전 집행: ${period})` : ""}`
            : `Picks similar to “${name ?? "campaign"}”.${period ? ` (Prior flight: ${period})` : ""}`,
        );

        if (matched.length > 0) {
          const pool = matched.length >= 3 ? matched : catalog;
          const similarInput: AiRecommendInput = {
            goal: "awareness",
            target: "mass",
            budgetMaxMan: 0,
            region: "all",
            industry: "other",
          };
          const scored = recommendMedia(similarInput, pool, catalog);
          if (scored.length > 0) {
            setFullList(scored);
            setPhase("dashboard");
          }
        }
      } catch (e) {
        console.error("[recommend] similar campaign", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [similarCampaignId, catalog, isKo]);

  const handleRemix = useCallback(() => {
    if (!lastPayload) return;
    const nextSeed = analysisSeed + 1;
    setAnalysisSeed(nextSeed);
    runAnalysis(lastPayload, nextSeed);
  }, [lastPayload, runAnalysis, analysisSeed]);

  if (catalog.length === 0) {
    return (
      <div className="border-t-2 border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center font-display text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          {`// `}
          {t("media.ai.emptyCatalog")}
        </div>
      </div>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page overflow-x-clip">
        <PageHero
          eyebrow="// 03 · DISCOVERY"
          title="AI가 추천하는 "
          highlight="맞춤 매체"
          description="목표·예산·업종 조건에 맞는 매체를 AI가 자동 추천"
        />
        <SubTabs tabs={DISCOVERY_TABS} currentPath="/recommend" />

        <section className="tkad-media-browse-main border-t border-border/60 bg-card py-16 sm:py-20">
          <div className="ui-container">
          {similarBanner ? (
            <p className="mb-6 rounded-2xl border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-4 py-3 text-center text-sm font-semibold text-[#0e7490] dark:text-[#22d3ee]">
              {similarBanner}
            </p>
          ) : null}
          {autoFromUrl === "1" && phase === "dashboard" && top3.length > 0 ? (
            <div className="mb-8 rounded-2xl border-2 border-accent/40 bg-muted/50 px-5 py-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                [ {isKo ? "홈에서 선택한 조건" : "From home widget"} ]
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {isKo
                  ? "조건에 맞는 TOP 3 매체 미리보기"
                  : "TOP 3 preview for your filters"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <BtnBlock
                  variant="primary"
                  size="md"
                  onClick={() => setPhase("list")}
                >
                  {isKo ? "전체 결과 보기" : "View all results"}
                </BtnBlock>
                <BtnBlock
                  variant="accent"
                  size="md"
                  onClick={() => void createQuoteFromRecommend()}
                  disabled={creatingQuote}
                >
                  {creatingQuote
                    ? isKo
                      ? "견적서 생성 중..."
                      : "Creating quote..."
                    : isKo
                      ? "이 플랜으로 견적서 만들기 →"
                      : "Create a quote with this plan →"}
                </BtnBlock>
                <BtnBlock
                  variant="secondary"
                  size="md"
                  onClick={goToContactQuote}
                  disabled={navigatingQuote}
                >
                  {isKo ? "전문가 상담 받기" : "Talk to an expert"}
                </BtnBlock>
              </div>
            </div>
          ) : null}
          {phase === "form" && autoFromUrl !== "1" && (
            <>
              <MediaAiRecommendForm
                locale={locale}
                onSubmit={handleFormSubmit}
              />
              <div className="mx-auto mt-4 max-w-xl">
                <TurnstileWidget onVerify={setCaptchaToken} />
              </div>
            </>
          )}

          {phase === "loading" && (
            <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center dark:bg-black bg-white dark:bg-white/6 bg-gray-500/50 backdrop-blur-md">
              <LoadingOverlay isKo={isKo} />
            </div>
          )}

          {phase === "dashboard" && fullList && fullList.length > 0 && (
            <MediaAiRecommendDashboard
              locale={locale}
              scored={fullList}
              top3={top3}
              quoteHref={quoteHref}
              onRequestQuote={goToContactQuote}
              onCreateQuote={() => void createQuoteFromRecommend()}
              creatingQuote={creatingQuote}
              quoteBusy={navigatingQuote}
              onBackToForm={() => {
                setPhase("form");
                setFullList(null);
              }}
              onViewFullList={() => setPhase("list")}
              onRemix={handleRemix}
            />
          )}

          {phase === "noResults" && (
            <div className="mx-auto max-w-lg border-2 border-border bg-muted p-8 text-center">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-hermes">
                [ NO RESULTS ]
              </p>
              <p className="mt-4 text-sm font-medium leading-relaxed text-foreground">
                {t("media.ai.emptyResult")}
              </p>
              <div className="mt-6 flex justify-center">
                <BtnBlock
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setPhase("form");
                    setFullList(null);
                  }}
                >
                  {tr("backToForm")}
                </BtnBlock>
              </div>
            </div>
          )}

          {phase === "list" && fullList && fullList.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    [ FULL LIST ]
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {t("media.ai.results")}{" "}
                    <span className="text-muted-foreground">({fullList.length})</span>
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BtnBlock
                    variant="secondary"
                    size="sm"
                    onClick={() => setPhase("dashboard")}
                  >
                    {tr("backToDashboard")}
                  </BtnBlock>
                  <BtnBlock
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPhase("form");
                      setFullList(null);
                    }}
                  >
                    {tr("backToForm")}
                  </BtnBlock>
                </div>
              </div>

              {top3.length > 0 && (
                <div className="rounded-[24px] border-2 border-accent bg-muted/60 px-5 py-4 shadow-sm backdrop-blur">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                    [ TOP 3 PICKS ]
                  </p>
                  <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
                    {isKo
                      ? "TKAD bot의 TOP 3 강추 발견"
                      : "TKAD bot's TOP 3 picks"}
                  </p>
                  <ol className="mt-3 space-y-1">
                    {top3.map((s, i) => (
                      <RecommendTop3PickRow
                        key={s.item.id}
                        scored={s}
                        index={i}
                        isKo={isKo}
                      />
                    ))}
                  </ol>
                </div>
              )}

              <ul className={RECOMMEND_MEDIA_GRID_CLASS}>
                {fullList.map((s, index) => (
                  <RecommendScoredMediaCard
                    key={s.item.id}
                    scored={s}
                    rank={index < 3 ? index + 1 : undefined}
                    isKo={isKo}
                    locale={locale}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <RecommendCartBar
        items={cartItems}
        locale={locale}
        maxItems={CART_MAX}
        onRemove={(id) =>
          setCartItems((prev) => prev.filter((m) => m.id !== id))
        }
        onClear={() => setCartItems([])}
      />

      {cartItems.length > 0 && <div className="h-20" />}
      </div>
    </HomeLandingDayNight>
  );
}

function LoadingOverlay({ isKo }: { isKo: boolean }) {
  const [step, setStep] = useState(0);

  const messages = useMemo(
    () =>
      isKo
        ? [
            "TKAD bot이 나침반을 들고 출발했어요… 오늘 탐험은 어떤 루트가 나올까요? 🧭",
            "강남·홍대·도심 핵심 스팟을 쭉 훑으면서 타겟이 많이 지나는 길을 먼저 체크하는 중이에요…",
            "조건에 맞는 후보 매체들을 한 명씩 불러 세워 ‘너 어디서 얼마나 보이니?’ 하고 인터뷰 중입니다…",
            "예산·노출·위치를 한 번에 넣고 궁합 점수를 계산하면서, 애매한 후보들은 살짝 뒤로 빼는 중이에요… 📊",
            "비슷한 매체끼리 1:1 매치업을 시켜서, 진짜 숨겨진 보석만 남기는 중이에요…",
            "거의 다 왔어요! 궁합 폭발 TOP 3 파티원만 정리해서 바로 보여드릴게요…",
          ]
        : [
            "TKAD bot just grabbed a compass and left base… let’s see what kind of route we discover today. 🧭",
            "Scanning city hotspots like Gangnam and Hongdae to see where your audience actually flows through…",
            "Stopping each candidate screen to ask, “Where are you, how visible are you, and who walks by?” one by one…",
            "Feeding budget, reach, and location into the score engine to weed out weak fits and keep the sharp ones… 📊",
            "Running mini duels between similar placements so only the real hidden gems and bosses stay in the deck…",
            "Almost done! TKAD bot is locking in your TOP 3 party members with the best overall chemistry…",
          ],
    [isKo],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="w-full max-w-md space-y-6 px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[44px] bg-[radial-gradient(closest-side,rgba(168,85,247,0.22),transparent_70%)] blur-xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[44px] bg-[radial-gradient(closest-side,rgba(34,211,238,0.16),transparent_70%)] blur-xl"
          />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] dark:text-white text-gray-900 shadow-[0_32px_140px_rgba(0,0,0,0.78)] backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(120%_90%_at_15%_10%,rgba(168,85,247,0.28),transparent_55%),radial-gradient(110%_85%_at_90%_25%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(95%_75%_at_45%_95%,rgba(236,72,153,0.12),transparent_60%)]"
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[32px] border dark:border-white/10 border-gray-200"
              animate={{ opacity: [0.35, 0.65, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="relative z-10 text-[44px]" aria-hidden>
              🤖
            </span>
          </div>

          <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2">
            <div className="rounded-2xl border border-white/16 dark:bg-black bg-white/30 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] dark:text-white text-gray-800 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
              TKAD BOT
            </div>
          </div>
        </div>
        <p className="mt-6 text-center font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700">
          [ {isKo ? "EXPLORING MEDIA UNIVERSE" : "EXPLORING MEDIA UNIVERSE"} ]
        </p>
        <p className="text-center text-sm font-bold leading-snug tracking-tight dark:text-white text-gray-900">
          {isKo
            ? "TKAD bot이 매체 탐험을 진행 중입니다..."
            : "TKAD bot is exploring the media universe for you..."}
        </p>
      </div>
      <div className="space-y-3 rounded-[28px] border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.75)] backdrop-blur">
        <div className="h-3 w-full overflow-hidden rounded-full border dark:border-white/14 border-gray-200 dark:bg-black bg-white/30">
          <motion.div
            className="h-full w-2/5 bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]"
            animate={{ x: ["-30%", "220%"] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded-full dark:bg-white/10 bg-gray-100" />
          <div className="h-3 w-4/5 rounded-full dark:bg-white/10 bg-gray-100" />
          <div className="h-3 w-3/5 rounded-full dark:bg-white/10 bg-gray-100" />
        </div>
      </div>
      <p className="text-center text-[11px] leading-relaxed tracking-tight dark:text-white text-gray-600">
        {`// `}{messages[step]}
      </p>
    </div>
  );
}
