"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { BtnBlock } from "@/components/brutalist";
import { usePlannerStore } from "@/lib/planner/store";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";

type ApiPick = {
  mediaId: string;
  name: string;
  nameEn: string;
  region: string;
  budgetMan: number;
  reason: string;
  monthlyImpressions: number;
  image: string | null;
};

type ApiResult = {
  ok?: boolean;
  data?: {
    source: string;
    summary: string;
    totalImpressions: number;
    totalBudgetMan: number;
    picks: ApiPick[];
  };
};

type Props = {
  catalog: MediaItem[];
};

export function PlannerAiRecommendStep({ catalog }: Props) {
  const t = useTranslations("planner");
  const locale = useLocale();
  const isKo = locale === "ko";
  const state = usePlannerStore();
  const setAiRecommendation = usePlannerStore((s) => s.setAiRecommendation);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult["data"] | null>(null);

  const fetchRecommend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/planner/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          brandName: state.brandName,
          campaignPurposes: state.campaignPurposes,
          industryKey: state.industryKey,
          ageKey: state.ageKey,
          genderKey: state.genderKey,
          interestKeys: state.interestKeys,
          regions: state.regions,
          categories: state.categories,
          budget: state.budget,
          months: state.months,
          flightStart: state.flightStart,
          flightEnd: state.flightEnd,
        }),
      });
      const json = (await res.json()) as ApiResult;
      if (!res.ok || json.ok === false || !json.data) {
        throw new Error("recommend failed");
      }
      setResult(json.data);
      const budgetMap: Record<string, number> = {};
      const ids: string[] = [];
      for (const p of json.data.picks) {
        ids.push(p.mediaId);
        budgetMap[p.mediaId] = p.budgetMan;
      }
      setAiRecommendation(ids, budgetMap, json.data.summary);
    } catch {
      setError(t("aiRecommendError"));
    } finally {
      setLoading(false);
    }
  }, [locale, state, setAiRecommendation, t]);

  useEffect(() => {
    void fetchRecommend();
  }, [fetchRecommend]);

  const formatImp = (n: number) =>
    n >= 10_000
      ? isKo
        ? `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`
        : `${(n / 1_000_000).toFixed(1)}M`
      : n.toLocaleString(isKo ? "ko-KR" : "en-US");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ STEP 3 / AI RECOMMEND ]
        </p>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          {t("stepAiTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("stepAiDesc")}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 border-2 border-border bg-card py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("aiRecommendLoading")}
          </p>
        </div>
      ) : error ? (
        <div className="border-2 border-destructive bg-card p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <BtnBlock className="mt-4" variant="secondary" size="md" onClick={() => void fetchRecommend()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("aiRecommendRetry")}
          </BtnBlock>
        </div>
      ) : result ? (
        <>
          <div className="border-2 border-primary bg-card p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {result.source === "anthropic" ? t("aiSourceLlm") : t("aiSourceRules")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-border bg-muted/40 p-3">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  {t("estTotalImp")}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {formatImp(result.totalImpressions)}
                </p>
              </div>
              <div className="border-2 border-border bg-muted/40 p-3">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  {t("budget")}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-accent">
                  {result.totalBudgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  {isKo ? "만원" : " (10k KRW)"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0">
            {result.picks.map((pick) => (
              <article
                key={pick.mediaId}
                className="relative -mt-[2px] -ml-[2px] flex flex-col gap-4 border-2 border-border bg-card p-4 sm:flex-row sm:items-start"
              >
                <Link
                  href={mediaItemDetailPath(pick.mediaId)}
                  className="relative block h-28 w-full shrink-0 overflow-hidden border-2 border-border sm:h-24 sm:w-36"
                >
                  <MediaCatalogThumbnail
                    media={
                      catalog.find((m) => m.id === pick.mediaId) ?? {
                        id: pick.mediaId,
                        name: pick.name,
                        nameEn: pick.nameEn,
                        location: "",
                        locationEn: "",
                        region: pick.region,
                        type: "digital",
                        price: 0,
                        lat: 0,
                        lng: 0,
                        dailyFootTraffic: 0,
                        sampleImages: pick.image ? [pick.image] : [],
                      }
                    }
                    placeholderLabel={t("imagePreparing")}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={mediaItemDetailPath(pick.mediaId)}
                    className="font-bold text-foreground hover:text-accent"
                  >
                    {isKo ? pick.name : pick.nameEn}
                  </Link>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {pick.region} · {t("aiBudgetAlloc", { amount: pick.budgetMan })}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pick.reason}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <BtnBlock variant="secondary" size="md" onClick={() => void fetchRecommend()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("aiRecommendRefresh")}
          </BtnBlock>
        </>
      ) : null}
    </div>
  );
}
