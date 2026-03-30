"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import RecommendQuiz from "@/components/recommend-quiz";
import RecommendSwipe from "@/components/recommend-swipe";
import RecommendResult from "@/components/recommend-result";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput, ScoredMedia } from "@/lib/ai-media-recommend";
import { recommendMedia } from "@/lib/ai-media-recommend";
import { buildSwipeDeck, type ScoredSwipeItem } from "@/lib/ai-swipe-recommend";
import { top3FromSwipeVotes, type SwipeVote } from "@/lib/ai-media-swipe-top3";
import { mediaItemDetailPath } from "@/lib/media-network-types";

const RecommendCartBar = dynamic(
  () => import("@/components/recommend-cart-bar"),
  { ssr: false },
);

const CART_MAX = 12;

type Phase = "quiz" | "loading" | "swipe" | "result" | "list";

export default function RecommendPageClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const tr = useTranslations("recommend");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [cartItems, setCartItems] = useState<MediaItem[]>([]);

  const regionOptions = useMemo(
    () => [
      { value: "all", label: t("media.allRegions") },
      { value: "seoul", label: t("media.regions.seoul") },
      { value: "seoul_gangnam", label: isKo ? "강남/서초" : "Gangnam/Seocho" },
      { value: "seoul_hongdae", label: isKo ? "홍대/마포" : "Hongdae/Mapo" },
      { value: "seoul_myeongdong", label: isKo ? "명동/중구" : "Myeongdong/Junggu" },
      { value: "seoul_yeouido", label: isKo ? "여의도/영등포" : "Yeouido/Yeongdeungpo" },
      { value: "seoul_gangbuk", label: isKo ? "강북/종로" : "Jongno/Gangbuk" },
      { value: "seoul_etc", label: isKo ? "기타 서울" : "Other Seoul" },
      { value: "busan", label: t("media.regions.busan") },
      { value: "jeju", label: t("media.regions.jeju") },
      { value: "national", label: t("media.regions.national") },
    ],
    [t, isKo],
  );

  const [phase, setPhase] = useState<Phase>("quiz");
  const [quizInput, setQuizInput] = useState<AiRecommendInput | null>(null);
  const [deck, setDeck] = useState<ScoredSwipeItem[]>([]);
  const [fullList, setFullList] = useState<ScoredMedia[] | null>(null);
  const [sessionVotes, setSessionVotes] = useState<SwipeVote[]>([]);
  const [top3, setTop3] = useState<ScoredMedia[]>([]);
  const [runKey, setRunKey] = useState(0);

  const toggleCart = useCallback((media: MediaItem) => {
    setCartItems((prev) => {
      const exists = prev.find((m) => m.id === media.id);
      if (exists) return prev.filter((m) => m.id !== media.id);
      if (prev.length >= CART_MAX) return prev;
      return [...prev, media];
    });
  }, []);

  const isInCart = useCallback(
    (id: string) => cartItems.some((m) => m.id === id),
    [cartItems],
  );

  const labelOverrides = useMemo(
    () => ({
      addCompare: tr("cartAdd"),
      addTop3: tr("addTop3ToCart"),
      quotePicked: tr("quoteWithCart"),
      quoteTop3: tr("quoteWithTop3"),
      quoteSingle: tr("quote"),
    }),
    [tr],
  );

  const quoteQueryPicked =
    cartItems.length > 0
      ? cartItems.map((m) => m.id).join(",")
      : top3.map((s) => s.item.id).join(",");

  const runAfterQuiz = useCallback(
    (input: AiRecommendInput, liked: readonly MediaItem[]) => {
      setPhase("loading");
      setQuizInput(input);
      window.setTimeout(() => {
        const full = recommendMedia(input, catalog);
        setFullList(full);
        setDeck(buildSwipeDeck(input, catalog, { liked }));
        setSessionVotes([]);
        setRunKey((k) => k + 1);
        setPhase("swipe");
      }, 900);
    },
    [catalog],
  );

  const handleQuizComplete = useCallback(
    (input: AiRecommendInput) => {
      runAfterQuiz(input, []);
    },
    [runAfterQuiz],
  );

  const handleSwipeComplete = useCallback(
    (votes: SwipeVote[]) => {
      setSessionVotes(votes);
      const pool = deck.slice(0, 10);
      setTop3(top3FromSwipeVotes(votes, pool));
      setPhase("result");
    },
    [deck],
  );

  const handleRecommendAgain = useCallback(() => {
    if (!quizInput) return;
    const liked = sessionVotes
      .filter((v) => v.action === "like" || v.action === "super")
      .map((v) => v.scored.item);
    runAfterQuiz(quizInput, liked);
  }, [quizInput, runAfterQuiz, sessionVotes]);

  if (catalog.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        {t("media.ai.emptyCatalog")}
      </div>
    );
  }

  return (
    <>
      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {tr("heroTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            {tr("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {phase === "quiz" && (
            <RecommendQuiz locale={locale} onComplete={handleQuizComplete} />
          )}

          {phase === "loading" && (
            <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-[#0f172a]/92 backdrop-blur-md">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-gold" />
              <p className="mt-5 text-sm font-semibold text-white">
                {t("media.ai.running")}
              </p>
            </div>
          )}

          {phase === "swipe" && deck.length > 0 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/[0.04] to-gold/[0.06] p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
                  <Sparkles className="h-5 w-5 text-gold" />
                  {t("media.ai.swipe.heroTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("media.ai.swipe.heroSubtitle")}
                </p>
              </div>
              <RecommendSwipe
                key={runKey}
                locale={locale}
                items={deck}
                compareItems={cartItems}
                toggleCompare={toggleCart}
                isInCompare={isInCart}
                maxSelectionItems={CART_MAX}
                addCompareLabel={labelOverrides.addCompare}
                quoteLabel={labelOverrides.quoteSingle}
                quoteQueryPicked={quoteQueryPicked}
                onRestartQuiz={() => {
                  setPhase("quiz");
                  setDeck([]);
                  setFullList(null);
                  setQuizInput(null);
                  setSessionVotes([]);
                }}
                onShowList={() => setPhase("list")}
                onSessionComplete={handleSwipeComplete}
              />
            </div>
          )}

          {phase === "swipe" && deck.length === 0 && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-8 text-center text-sm text-amber-950">
              {t("media.ai.emptyResult")}
              <div className="mt-4">
                <Button type="button" onClick={() => setPhase("quiz")}>
                  {t("media.ai.swipe.restartQuiz")}
                </Button>
              </div>
            </div>
          )}

          {phase === "result" && top3.length > 0 && (
            <RecommendResult
              locale={locale}
              top3={top3}
              quoteLabel={labelOverrides.quoteSingle}
              onRestartQuiz={() => {
                setPhase("quiz");
                setDeck([]);
                setFullList(null);
                setQuizInput(null);
                setSessionVotes([]);
              }}
              onViewFullList={() => setPhase("list")}
              onRecommendAgain={handleRecommendAgain}
            />
          )}

          {phase === "list" && fullList && fullList.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-navy">
                  {t("media.ai.results")}{" "}
                  <span className="text-muted-foreground">
                    ({fullList.length})
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setPhase("swipe")}
                  >
                    {t("media.ai.swipe.backToSwipe")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setPhase("quiz")}
                  >
                    {t("media.ai.swipe.restartQuiz")}
                  </Button>
                </div>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {fullList.map((s) => (
                  <li
                    key={s.item.id}
                    className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm"
                  >
                    <p className="font-bold text-navy">
                      {isKo ? s.item.name : s.item.nameEn}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {isKo ? s.item.location : s.item.locationEn}
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-navy/80">
                      {s.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>· {isKo ? r.ko : r.en}</li>
                      ))}
                    </ul>
                    <Link
                      href={mediaItemDetailPath(s.item.id)}
                      className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold-dark"
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
