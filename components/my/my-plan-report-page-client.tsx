"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { PageContainer } from "@/components/layout/page-container";
import { MOBILE_CHROME_BOTTOM_PAD } from "@/lib/layout/container-classes";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { buildPlanCartReportBundle } from "@/lib/plan-cart-report/build-report";
import { PlanCartRegionalBreakdown } from "@/components/my/plan-cart-regional-breakdown";
import { usePlannerReportSectionVisibility } from "@/hooks/use-planner-report-section-visibility";
import { sectionVisible } from "@/lib/planner-report-export/section-visibility";
import { SavePlanButton } from "@/components/my/save-plan-button";
import PlannerReportStep from "@/components/planner-report-step";
import { BtnBlock } from "@/components/brutalist";
import { trackPlanReportActivity } from "@/lib/plan-report-activity/client";
import { cn } from "@/lib/utils";

export function MyPlanReportPageClient() {
  const tPlan = useTranslations("planNav");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { cart } = usePlanCart();
  const [catalog, setCatalog] = useState<MediaItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(false);
    try {
      const res = await fetch("/api/public/media-catalog", { cache: "no-store" });
      if (!res.ok) throw new Error("catalog fetch failed");
      const data = await res.json();
      setCatalog(Array.isArray(data) ? (data as MediaItem[]) : []);
    } catch {
      setCatalogError(true);
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const bundle = useMemo(() => {
    if (catalogLoading || cart.items.length === 0) return null;
    return buildPlanCartReportBundle({ cart, catalog, isKo });
  }, [cart, catalog, catalogLoading, isKo]);

  const [sectionVisibility, setSectionVisibility] =
    usePlannerReportSectionVisibility();

  const viewLoggedRef = useRef(false);
  useEffect(() => {
    if (!bundle || viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    void trackPlanReportActivity({
      eventType: "view",
      source: "plan_cart_report",
      mediaCount: bundle.reportProps.portfolio.length,
      goalTitle: bundle.reportProps.goalTitle,
      regionsText: bundle.reportProps.regionsText,
      reportTitle: isKo ? "담은 매체 보고서" : "Selected media report",
    });
  }, [bundle, isKo]);

  return (
    <>
      <div className={cn(MOBILE_CHROME_BOTTOM_PAD)}>
        <PageContainer>
          <div className="mb-8">
            <Link
              href="/my/plan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-white/55 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {tPlan("cart")}
            </Link>
            <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-fg-muted)]">
              [ MY PLAN REPORT ]
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              {isKo ? "담은 매체 보고서" : "Selected media report"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "플래너 없이 담은 매체만으로 전체 제안 보고서를 생성합니다."
                : "Full proposal report from your plan cart — no planner wizard."}
            </p>
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500 dark:text-white/55">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isKo ? "매체 정보를 불러오는 중…" : "Loading media…"}
            </div>
          ) : cart.items.length === 0 ? (
            <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-10 text-center dark:border-white/12 dark:bg-white/5">
              <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
                {isKo ? "담은 매체가 없습니다" : "No media in your plan"}
              </p>
              <div className="mt-6">
                <BtnBlock href="/media" variant="accent">
                  {isKo ? "매체 담으러 가기" : "Browse media"}
                </BtnBlock>
              </div>
            </div>
          ) : catalogError ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-100">
                {isKo
                  ? "매체 목록을 불러오지 못했습니다."
                  : "Could not load media catalog."}
              </p>
              <BtnBlock
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => void loadCatalog()}
              >
                {isKo ? "다시 시도" : "Retry"}
              </BtnBlock>
            </div>
          ) : bundle ? (
            <div className="space-y-10">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <SavePlanButton
                  cart={cart}
                  isKo={isKo}
                  source="plan_report"
                  reportSummary={{
                    goalTitle: bundle.reportProps.goalTitle,
                    regionsText: bundle.reportProps.regionsText,
                    categoriesText: bundle.reportProps.categoriesText,
                    mediaCount: cart.items.length,
                    budgetMan: bundle.reportProps.budgetNum,
                    months: bundle.reportProps.months,
                    regionalBreakdown: bundle.regionalBreakdown.map((r) => ({
                      regionKey: r.regionKey,
                      label: r.label,
                      mediaCount: r.mediaCount,
                      budgetPct: r.budgetPct,
                    })),
                  }}
                />
                <BtnBlock href="/my/plan/saved" variant="secondary">
                  {tPlan("saved")}
                </BtnBlock>
              </div>
              {sectionVisible(sectionVisibility, "region") ? (
                <PlanCartRegionalBreakdown
                  rows={bundle.regionalBreakdown}
                  isKo={isKo}
                />
              ) : null}
              <PlannerReportStep
                {...bundle.reportProps}
                regionBreakdown={bundle.regionalBreakdown}
                regionBudgetCharts={bundle.regionBudgetCharts}
                regionImpressionCharts={bundle.regionImpressionCharts}
                activitySource="plan_cart_report"
                sectionVisibility={sectionVisibility}
                onSectionVisibilityChange={setSectionVisibility}
              />
            </div>
          ) : null}
        </PageContainer>
      </div>
    </>
  );
}
