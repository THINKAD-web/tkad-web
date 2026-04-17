"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useToast } from "@/components/toast-provider";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
import { logClientError } from "@/lib/client-log";

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
          logClientError("[recommend] runAnalysis", e);
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        {t("media.ai.emptyCatalog")}
      </div>
    );
  }

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold text-gold">
              {isKo ? "AI 매체 탐험가" : "AI Media Explorer"}
            </span>
            <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              BETA
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {isKo ? "TKAD Bot과 함께 매체 탐험 시작! ✨" : tr("heroTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            {isKo
              ? "몇 가지 정보만 알려주시면, TKAD Bot이 캠페인에 꼭 맞는 매체들을 찾아드려요."
              : tr("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-navy/95 via-[#0c1a42] to-[#060d1a] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {phase === "form" && (
            <MediaAiRecommendForm
              locale={locale}
              onSubmit={handleFormSubmit}
            />
          )}

          {phase === "loading" && (
            <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
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
            <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center shadow-lg">
              <p className="text-sm font-medium text-amber-950">
                {t("media.ai.emptyResult")}
              </p>
              <Button
                type="button"
                className="mt-6 rounded-full border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                onClick={() => {
                  setPhase("form");
                  setFullList(null);
                }}
              >
                {tr("backToForm")}
              </Button>
            </div>
          )}

          {phase === "list" && fullList && fullList.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-navy">
                  {t("media.ai.results")}{" "}
                  <span className="text-muted-foreground">({fullList.length})</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-navy/15 bg-white text-navy hover:bg-slate-100"
                    onClick={() => setPhase("dashboard")}
                  >
                    {tr("backToDashboard")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setPhase("form");
                      setFullList(null);
                    }}
                  >
                    {tr("backToForm")}
                  </Button>
                </div>
              </div>

              {top3.length > 0 && (
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-50/70 px-4 py-3 text-xs text-navy shadow-sm">
                  <p className="mb-2 font-semibold text-emerald-900">
                    {isKo
                      ? "TKAD bot의 TOP 3 강추 발견"
                      : "TKAD bot’s TOP 3 picks"}
                  </p>
                  <ol className="space-y-1.5">
                    {top3.map((s, i) => (
                      <li
                        key={s.item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700">
                            {i + 1}
                          </span>
                          <span className="line-clamp-1 text-[11px] font-semibold">
                            {isKo ? s.item.name : s.item.nameEn}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] font-medium text-emerald-800/90">
                          {isKo ? `${s.score}점 궁합` : `Match ${s.score}`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <ul className="grid gap-4 sm:grid-cols-2">
                {fullList.map((s) => (
                  <li
                    key={s.item.id}
                    className="rounded-xl border border-navy/10 bg-white p-4 text-center shadow-sm sm:text-left"
                  >
                    <p className="font-bold text-navy">
                      {isKo ? s.item.name : s.item.nameEn}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {isKo ? s.item.location : s.item.locationEn}
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {s.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>· {isKo ? r.ko : r.en}</li>
                      ))}
                    </ul>
                    <Link
                      href={mediaItemDetailPath(s.item.id)}
                      className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold/90"
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
    <div className="w-full max-w-sm space-y-6 px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold to-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.8)] ring-2 ring-gold/80">
          <span className="text-2xl" aria-hidden>
            🤖
          </span>
          <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/95 px-2.5 py-0.5 text-[10px] font-semibold text-gold shadow">
            TKAD bot
          </span>
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-navy">
          {isKo
            ? "TKAD bot이 매체 탐험을 진행 중입니다..."
            : "TKAD bot is exploring the media universe for you..."}
        </p>
      </div>
      <div className="space-y-3 rounded-2xl border border-navy/10 bg-gradient-to-b from-slate-900/5 via-white to-slate-100 p-6 shadow-lg">
        <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
          <motion.div
            className="h-full w-2/5 rounded-full bg-gradient-to-r from-emerald-300 via-gold to-amber-500 shadow-[0_0_18px_rgba(16,185,129,0.8)]"
            animate={{ x: ["-30%", "220%"] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded bg-slate-200/90" />
          <div className="h-3 w-4/5 rounded bg-slate-200/80" />
          <div className="h-3 w-3/5 rounded bg-slate-200/70" />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {messages[step]}
      </p>
    </div>
  );
}
