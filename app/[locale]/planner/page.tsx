"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  MapPin,
  Layers,
  Send,
  TrendingUp,
  Wallet,
  CalendarRange,
} from "lucide-react";
import { mediaData } from "@/lib/media-data";
import {
  type PlannerCategory,
  filterPlannerMedia,
  computePlannerMetrics,
} from "@/lib/planner-logic";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [1, 3, 6, 12] as const;

const STORAGE_KEY = "tkad-planner-plan";

type RegionKey = "all" | "seoul" | "busan" | "jeju" | "national";

const REGIONS: RegionKey[] = ["all", "seoul", "busan", "jeju", "national"];

const CATEGORIES: { key: PlannerCategory; labelKey: "catBillboard" | "catBus" | "catSubway" }[] = [
  { key: "billboard", labelKey: "catBillboard" },
  { key: "bus", labelKey: "catBus" },
  { key: "subway", labelKey: "catSubway" },
];

export default function PlannerPage() {
  const t = useTranslations("planner");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [region, setRegion] = useState<RegionKey>("all");
  const [categories, setCategories] = useState<Set<PlannerCategory>>(
    () => new Set<PlannerCategory>(["billboard", "bus", "subway"]),
  );
  const [budget, setBudget] = useState<string>("5000");
  const [months, setMonths] = useState<number>(3);

  const toggleCategory = (key: PlannerCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filtered = useMemo(
    () => filterPlannerMedia(mediaData, region, categories),
    [region, categories],
  );

  const budgetNum = Number.parseInt(budget.replace(/,/g, ""), 10) || 0;

  const metrics = useMemo(() => {
    if (filtered.length === 0 || budgetNum < 1) return null;
    return computePlannerMetrics(filtered, budgetNum, months);
  }, [filtered, budgetNum, months]);

  const roiMax = metrics
    ? Math.max(
        metrics.roiOptimistic,
        metrics.roiExpected,
        metrics.roiConservative,
        0.1,
      )
    : 1;

  const impMax = metrics?.cumulativeByMonth.length
    ? metrics.cumulativeByMonth[metrics.cumulativeByMonth.length - 1].impressions
    : 1;

  const savePlan = useCallback(() => {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        region,
        categories: [...categories],
        budget: budgetNum,
        months,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      toast("success", t("savedToast"));
    } catch {
      toast("error", isKo ? "저장에 실패했습니다." : "Could not save plan.");
    }
  }, [region, categories, budgetNum, months, toast, t, isKo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="relative overflow-hidden bg-navy py-14 text-white sm:py-18">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,213,181,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="border-gold/40 bg-gold/15 text-gold">
            THINKAD Planner
          </Badge>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <Card className="border-navy/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-navy">
                  <Layers className="h-5 w-5 text-gold" />
                  {t("region")}
                </CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={region === r ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full touch-manipulation",
                      region === r && "btn-gold border-0",
                    )}
                    onClick={() => setRegion(r)}
                  >
                    <MapPin className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                    {r === "all" ? t("regionAll") : tm(`regions.${r}`)}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-navy/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-navy">
                  <BarChart3 className="h-5 w-5 text-gold" />
                  {t("category")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {CATEGORIES.map(({ key, labelKey }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={categories.has(key) ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full touch-manipulation",
                      categories.has(key) && "btn-gold border-0",
                    )}
                    onClick={() => toggleCategory(key)}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-navy/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-navy">
                  <Wallet className="h-5 w-5 text-gold" />
                  {t("budget")}
                </CardTitle>
                <CardDescription>{t("budgetHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) =>
                    setBudget(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="h-12 border-navy/15 text-lg font-semibold"
                  aria-label={t("budget")}
                />
              </CardContent>
            </Card>

            <Card className="border-navy/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-navy">
                  <CalendarRange className="h-5 w-5 text-gold" />
                  {t("period")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={months === m ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "min-w-[4.5rem] rounded-full touch-manipulation",
                      months === m && "btn-gold border-0",
                    )}
                    onClick={() => setMonths(m)}
                  >
                    {isKo ? (
                      <>
                        {m}
                        {t("months")}
                      </>
                    ) : (
                      <>
                        {m} {m === 1 ? t("month") : t("months")}
                      </>
                    )}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className="flex-1">
                <Button className="btn-gold h-12 w-full rounded-full font-semibold">
                  <Send className="mr-2 h-4 w-4" />
                  {t("ctaQuote")}
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-full border-navy/20 font-semibold text-navy"
                onClick={savePlan}
              >
                <Download className="mr-2 h-4 w-4" />
                {t("ctaSave")}
              </Button>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-7">
            {filtered.length === 0 ? (
              <Card className="border-dashed border-navy/20 bg-slate-50/80">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">{t("emptyFilter")}</p>
                  <Link href="/media" className="mt-4 inline-block">
                    <Button variant="outline" className="rounded-full">
                      {t("browseMedia")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : budgetNum < 1 ? (
              <Card className="border-dashed border-gold/30 bg-gold/5">
                <CardContent className="py-10 text-center text-navy">
                  {t("needBudget")}
                </CardContent>
              </Card>
            ) : metrics ? (
              <>
                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("results")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-navy/10 bg-white p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("matchedMedia")}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">
                        {filtered.length}
                        <span className="ml-1 text-base font-semibold text-muted-foreground">
                          {t("countUnit")}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-navy/10 bg-white p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("avgMonthlySlot")}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">
                        {Math.round(metrics.avgMonthlyPrice).toLocaleString()}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">
                          {isKo ? "만원/월" : "₩10K/mo"}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-navy/10 bg-white p-4 sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("estMonthlyImp")}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-gold-dark">
                        {metrics.estimatedMonthlyImpressions.toLocaleString()}
                      </p>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        {t("estTotalImp")}
                      </p>
                      <p className="mt-1 text-xl font-bold text-navy">
                        {metrics.estimatedTotalImpressions.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-navy">
                      <TrendingUp className="h-5 w-5 text-gold" />
                      {t("roiTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(
                      [
                        ["roiConservative", metrics.roiConservative],
                        ["roiExpected", metrics.roiExpected],
                        ["roiOptimistic", metrics.roiOptimistic],
                      ] as const
                    ).map(([labelKey, val]) => (
                      <div key={labelKey}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-navy">
                            {t(labelKey)}
                          </span>
                          <span className="font-bold text-gold-dark">
                            {val}
                            {t("roiUnit")}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (val / roiMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("chartImpTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-52 items-end justify-stretch gap-1 sm:gap-2">
                      {metrics.cumulativeByMonth.map(({ month, impressions }) => {
                        const barH = Math.max(
                          12,
                          Math.round((impressions / impMax) * 168),
                        );
                        return (
                          <div
                            key={month}
                            className="flex min-w-0 flex-1 flex-col items-center gap-2"
                          >
                            <div
                              className="w-full max-w-[3.25rem] rounded-t-md bg-gradient-to-t from-navy/90 to-gold/80 transition-all"
                              style={{ height: barH }}
                              title={impressions.toLocaleString()}
                            />
                            <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                              {isKo ? `${month}개월` : `M${month}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}

            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
              {t("disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
