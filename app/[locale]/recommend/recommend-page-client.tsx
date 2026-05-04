"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useToast } from "@/components/toast-provider";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
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
} from "@/lib/ai-media-recommend";
import { mediaItemDetailPath } from "@/lib/media-network-types";

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

  const [cartItems, setCartItems] = useState<MediaItem[]>([]);

  const [phase, setPhase] = useState<Phase>("form");
  const [fullList, setFullList] = useState<ScoredMedia[] | null>(null);
  const [lastPayload, setLastPayload] =
    useState<MediaAiRecommendFormSubmit | null>(null);

  const top3 = useMemo(() => {
    if (!fullList?.length) return [];
    return fullList.slice(0, 3);
  }, [fullList]);

  const quoteQueryPicked =
    cartItems.length > 0
      ? cartItems.map((m) => m.id).join(",")
      : top3.map((s) => s.item.id).join(",");

  const quoteHref = `/quote?media=${encodeURIComponent(quoteQueryPicked)}`;

  const runAnalysis = useCallback(
    (payload: MediaAiRecommendFormSubmit) => {
      setPhase("loading");
      window.setTimeout(() => {
        try {
          const poolRegion = filterCatalogByRegionCodes(
            catalog,
            payload.regionCodes,
          );
          const q = payload.searchQuery.trim().toLowerCase();
          const poolFiltered =
            q.length > 0
              ? poolRegion.filter((m) => matchesMediaTextQuery(m, q))
              : poolRegion;
          /** 검색으로만 비면 지역 풀, 지역까지 비면 전체 카탈로그. 보강은 지역 풀 → 전체 순 */
          const baseCatalog =
            poolFiltered.length > 0 ? poolFiltered : catalog;
          const paddingSource =
            poolRegion.length > 0 ? poolRegion : catalog;
          let scored = recommendMedia(
            payload.input,
            baseCatalog,
            paddingSource,
          );
          if (scored.length === 0 && q.length > 0 && poolRegion.length > 0) {
            scored = recommendMedia(
              payload.input,
              poolRegion,
              paddingSource,
            );
          }
          setFullList(scored);
          setPhase(scored.length > 0 ? "dashboard" : "noResults");
        } catch (e) {
          console.error("[recommend] runAnalysis", e);
          setFullList(null);
          setPhase("form");
          toast("error", tr("analysisFailed"));
        }
      }, 900);
    },
    [catalog, toast, tr],
  );

  const handleFormSubmit = useCallback(
    (payload: MediaAiRecommendFormSubmit) => {
      setLastPayload(payload);
      runAnalysis(payload);
    },
    [runAnalysis],
  );

  const handleRemix = useCallback(() => {
    if (!lastPayload) return;
    const tweaked: MediaAiRecommendFormSubmit = {
      ...lastPayload,
      input: {
        ...lastPayload.input,
        budgetMaxMan: Math.round(lastPayload.input.budgetMaxMan * 1.1),
      },
    };
    runAnalysis(tweaked);
  }, [lastPayload, runAnalysis]);

  if (catalog.length === 0) {
    return (
      <div className="border-t-2 border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          {`// `}
          {t("media.ai.emptyCatalog")}
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-b from-hero-void via-hero-void to-[#0c0c10] py-20 text-hero-fg sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wide text-hermes sm:text-sm">
            {isKo ? "AI 매체 추천" : "AI media recommendation"}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-hero-fg/70">
            {`// 04 / AI Media Explorer`}
          </p>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-3xl font-black leading-[1.12] tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
              {isKo ? "TKAD Bot과 함께 매체 탐험 시작!" : tr("heroTitle")}
            </h1>
            <span className="border border-hermes/70 bg-hermes/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-hermes">
              BETA
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-hero-fg/85 sm:text-lg">
            {isKo
              ? "몇 가지 정보만 알려주시면, TKAD Bot이 캠페인에 꼭 맞는 매체들을 찾아드려요."
              : tr("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="border-t-2 border-border bg-card py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {phase === "form" && (
            <MediaAiRecommendForm
              locale={locale}
              onSubmit={handleFormSubmit}
            />
          )}

          {phase === "loading" && (
            <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
              <LoadingOverlay isKo={isKo} />
            </div>
          )}

          {phase === "dashboard" && fullList && fullList.length > 0 && (
            <MediaAiRecommendDashboard
              locale={locale}
              scored={fullList}
              top3={top3}
              quoteHref={quoteHref}
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
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-hermes">
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
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    [ FULL LIST ]
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {t("media.ai.results")}{" "}
                    <span className="font-mono text-muted-foreground">({fullList.length})</span>
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
                <div className="border-2 border-accent bg-muted px-5 py-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                    [ TOP 3 PICKS ]
                  </p>
                  <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
                    {isKo
                      ? "TKAD bot의 TOP 3 강추 발견"
                      : "TKAD bot's TOP 3 picks"}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {top3.map((s, i) => (
                      <li
                        key={s.item.id}
                        className="flex items-center justify-between gap-2 border-t-2 border-border pt-2"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border bg-accent font-mono text-[10px] font-bold text-accent-foreground">
                            {i + 1}
                          </span>
                          <span className="line-clamp-1 text-sm font-bold tracking-tight text-foreground">
                            {isKo ? s.item.name : s.item.nameEn}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                          {isKo ? `${s.score}점 궁합` : `MATCH ${s.score}`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {fullList.map((s) => (
                  <li
                    key={s.item.id}
                    className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-5 transition-colors hover:bg-muted"
                  >
                    <p className="text-base font-bold leading-tight tracking-tight text-foreground">
                      {isKo ? s.item.name : s.item.nameEn}
                    </p>
                    <p className="mt-2 line-clamp-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{isKo ? s.item.location : s.item.locationEn}
                    </p>
                    <ul className="mt-3 space-y-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                      {s.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>· {isKo ? r.ko : r.en}</li>
                      ))}
                    </ul>
                    <Link
                      href={mediaItemDetailPath(s.item.id)}
                      className="mt-4 inline-flex items-center gap-1 border-b-2 border-border pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      {isKo ? "상세 보기" : "Details"} →
                    </Link>
                  </li>
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
    </>
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
        <div className="relative flex h-20 w-20 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
          <span className="text-3xl" aria-hidden>
            🤖
          </span>
          <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 border-2 border-border bg-hero-void px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-hermes">
            TKAD bot
          </span>
        </div>
        <p className="mt-6 text-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
          [ {isKo
            ? "EXPLORING MEDIA UNIVERSE"
            : "EXPLORING MEDIA UNIVERSE"} ]
        </p>
        <p className="text-center text-sm font-bold leading-snug tracking-tight text-foreground">
          {isKo
            ? "TKAD bot이 매체 탐험을 진행 중입니다..."
            : "TKAD bot is exploring the media universe for you..."}
        </p>
      </div>
      <div className="space-y-3 border-2 border-border bg-card p-6">
        <div className="h-3 w-full overflow-hidden border-2 border-border bg-card">
          <motion.div
            className="h-full w-2/5 bg-hermes"
            animate={{ x: ["-30%", "220%"] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted" />
          <div className="h-3 w-4/5 bg-muted" />
          <div className="h-3 w-3/5 bg-muted" />
        </div>
      </div>
      <p className="text-center font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
        {`// `}{messages[step]}
      </p>
    </div>
  );
}
