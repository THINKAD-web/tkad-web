"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import MediaAiRecommendForm, {
  type MediaAiRecommendFormSubmit,
} from "@/components/media-ai-recommend-form";
import MediaAiRecommendDashboard from "@/components/media-ai-recommend-dashboard";
import type { MediaItem } from "@/lib/media-data";
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
  const locale = useLocale();
  const isKo = locale === "ko";

  const [cartItems, setCartItems] = useState<MediaItem[]>([]);

  const [phase, setPhase] = useState<Phase>("form");
  const [fullList, setFullList] = useState<ScoredMedia[] | null>(null);

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
        const pool = filterCatalogByRegionCodes(catalog, payload.regionCodes);
        const scored = recommendMedia(payload.input, pool);
        setFullList(scored);
        setPhase(scored.length > 0 ? "dashboard" : "noResults");
      }, 900);
    },
    [catalog],
  );

  const handleFormSubmit = useCallback(
    (payload: MediaAiRecommendFormSubmit) => {
      runAnalysis(payload);
    },
    [runAnalysis],
  );

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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 px-4 py-1.5 text-xs font-semibold text-gold">
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

      <section className="bg-navy py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {phase === "form" && (
            <MediaAiRecommendForm
              locale={locale}
              onSubmit={handleFormSubmit}
            />
          )}

          {phase === "loading" && (
            <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-[#0a1628]/95 backdrop-blur-md">
              <div className="w-full max-w-sm space-y-6 px-6">
                <p className="text-center text-sm font-semibold text-gold">
                  {tr("loadingTitle")}
                </p>
                <div className="space-y-3 rounded-2xl border border-gold/20 bg-navy/80 p-6 shadow-xl">
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full w-2/5 rounded-full bg-gradient-to-r from-gold/70 to-gold"
                      animate={{ x: ["-30%", "220%"] }}
                      transition={{
                        duration: 1.35,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-white/10" />
                    <div className="h-3 w-4/5 rounded bg-white/10" />
                    <div className="h-3 w-3/5 rounded bg-white/10" />
                  </div>
                </div>
                <p className="text-center text-xs text-slate-400">
                  {tr("loadingSubtitle")}
                </p>
              </div>
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
            />
          )}

          {phase === "noResults" && (
            <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-navy/60 p-8 text-center shadow-xl">
              <p className="text-sm font-medium text-amber-100">
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
                <h2 className="text-lg font-bold text-white">
                  {t("media.ai.results")}{" "}
                  <span className="text-slate-400">({fullList.length})</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
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
              <ul className="grid gap-4 sm:grid-cols-2">
                {fullList.map((s) => (
                  <li
                    key={s.item.id}
                    className="rounded-xl border border-gold/15 bg-navy/50 p-4 shadow-sm"
                  >
                    <p className="font-bold text-white">
                      {isKo ? s.item.name : s.item.nameEn}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {isKo ? s.item.location : s.item.locationEn}
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
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
