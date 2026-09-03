"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  isPlannerIndustryKey,
  PLANNER_INDUSTRY_KEYS,
  type PlannerIndustryKey,
} from "@/lib/planner/types";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { PageContainer } from "@/components/layout/page-container";
import { MOBILE_CHROME_BOTTOM_PAD } from "@/lib/layout/container-classes";
import { BtnBlock } from "@/components/brutalist";
import { PlanCartLineCard } from "@/components/plan/plan-cart-line-card";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { PLAN_CART_DURATION_OPTIONS } from "@/lib/plan-cart";
import { setPlanCartUserEditing } from "@/lib/plan-cart-local-guard";
import {
  planCartAddonTotalWon,
  planCartCatalogById,
  planCartMonthlyTotalWon,
  planCartPeriodTotalWon,
} from "@/lib/plan-cart-pricing";
import {
  buildMyPlanPlannerHref,
  mapPlanCartGoalToPlanner,
} from "@/lib/plan-cart-planner-bridge";
import { PlannerCampaignGoalGrid } from "@/components/planner/planner-campaign-goal-grid";
import { SavePlanButton } from "@/components/my/save-plan-button";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { formatCatalogPriceFieldWon, mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import { packagePeriodToggleMeta } from "@/lib/quote-package-period-toggle";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

export function MyPlanPageClient() {
  const tPlan = useTranslations("planNav");
  const tPlanner = useTranslations("planner");
  const tQuote = useTranslations("quote");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const toast = useAppToast();
  const { user } = useAuthSession();
  const {
    cart,
    remove,
    clear,
    updateMeta,
    reorder,
    updateItem,
    togglePackagePeriod,
  } = usePlanCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const budgetEditingRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MediaItem[]>([]);

  const packagePeriodOnlyLabel = tQuote("usePackagePeriodOnly", {
    period: "{period}",
  });

  const resolveCartPackageMeta = useCallback(
    (item: (typeof cart.items)[number], media?: MediaItem) => {
      if (!media) return null;
      const poIdx = item.priceOptionIndex ?? 0;
      return packagePeriodToggleMeta(media, poIdx);
    },
    [],
  );

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/public/media-catalog", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCatalog(Array.isArray(data) ? (data as MediaItem[]) : []);
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (budgetEditingRef.current) return;
    setBudgetInput(
      cart.totalBudget != null && cart.totalBudget > 0
        ? String(Math.round(cart.totalBudget / 10_000))
        : "",
    );
  }, [cart.totalBudget]);

  const catalogById = useMemo(() => planCartCatalogById(catalog), [catalog]);
  const monthlyTotal = useMemo(
    () => planCartMonthlyTotalWon(cart, catalogById),
    [cart, catalogById],
  );
  const addonTotal = useMemo(() => planCartAddonTotalWon(cart), [cart]);
  const duration = cart.duration ?? 1;
  const periodTotal = useMemo(
    () => planCartPeriodTotalWon(cart, catalogById),
    [cart, catalogById],
  );
  const plannerHref = buildMyPlanPlannerHref(
    cart.items.map((item) => item.mediaId),
  );
  const reportHref = "/my/plan/report";
  const selectedGoal = mapPlanCartGoalToPlanner(cart.campaignGoal);
  const selectedIndustry: PlannerIndustryKey | null = isPlannerIndustryKey(
    cart.industryKey,
  )
    ? cart.industryKey
    : null;

  function formatWon(amount: number) {
    if (amount <= 0) return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
    return formatCatalogPriceFieldWon(amount, isKo ? "ko-KR" : "en-US");
  }

  async function handleQuoteRequest() {
    const mediaIds = cart.items.map((item) => item.mediaId).filter(Boolean);
    if (mediaIds.length === 0) {
      toast.warning(isKo ? "담은 매체가 없습니다." : "No media in your plan.");
      return;
    }
    try {
      if (user) {
        await fetch("/api/my/plan/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items,
            addonLines: cart.addonLines,
            campaignGoal: cart.campaignGoal,
            totalBudget: cart.totalBudget,
            duration: cart.duration,
            updatedAt: cart.updatedAt,
          }),
        });
      }
    } catch {
      /* localStorage still holds plan */
    }
    router.push(`/quote?media=${mediaIds.join(",")}`);
  }

  function handleClear() {
    clear();
    setConfirmClear(false);
    toast.success(isKo ? "플랜을 초기화했습니다." : "Plan cleared.");
  }

  function handleDropOnItem(targetMediaId: string) {
    if (!draggingId || draggingId === targetMediaId) return;
    const fromIndex = cart.items.findIndex((i) => i.mediaId === draggingId);
    const toIndex = cart.items.findIndex((i) => i.mediaId === targetMediaId);
    if (fromIndex < 0 || toIndex < 0) return;
    reorder(fromIndex, toIndex);
    setDraggingId(null);
    setDragOverId(null);
  }

  function moveItem(mediaId: string, direction: "up" | "down") {
    const index = cart.items.findIndex((i) => i.mediaId === mediaId);
    if (index < 0) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= cart.items.length) return;
    reorder(index, nextIndex);
  }

  return (
    <>
      <div className={cn(MOBILE_CHROME_BOTTOM_PAD)}>
        <PageContainer>
          <div className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-fg-muted)]">
              [ MY PLAN ]
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              {tPlan("cart")}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "담은 매체로 보고서를 만들거나 견적을 요청하세요. 저장 후에는 「저장 스냅샷」에서 확인할 수 있습니다."
                : "Generate a report or request a quote. After saving, find it under Plan snapshots."}
            </p>
            <div className="mt-3">
              <Link
                href="/my/plan/saved"
                className="text-xs font-semibold text-[color:var(--qp-accent)] hover:opacity-90"
              >
                {isKo ? `${tPlan("saved")} 보기 →` : `View ${tPlan("saved")} →`}
              </Link>
            </div>
          </div>

          {cart.items.length === 0 ? (
            <div className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-10 text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
                {isKo ? "아직 담은 매체가 없어요" : "No media in your plan yet"}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/media"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border dark:border-white/12 border-gray-200 px-5 py-3 text-sm font-bold dark:text-white text-gray-900"
                >
                  {isKo ? "매체 검색하기" : "Browse media"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/recommend"
                  className="tkad-qp-cta inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  {isKo ? "AI 추천 받기" : "AI recommend"}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-8">
              <div className="space-y-6 lg:sticky lg:top-24">
              <section className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black/40 bg-white/70 p-5 backdrop-blur">
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/50">
                  {isKo ? "캠페인 설정" : "Campaign settings"}
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-white/60">
                      {isKo ? "목표" : "Goal"}
                    </label>
                    <PlannerCampaignGoalGrid
                      compact
                      selected={selectedGoal}
                      onSelect={(key) => updateMeta({ campaignGoal: key })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-white/60">
                      {isKo ? "예산 (만원/월)" : "Budget (10K KRW/mo)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={budgetInput}
                      onFocus={() => {
                        budgetEditingRef.current = true;
                        setPlanCartUserEditing(true);
                      }}
                      onBlur={() => {
                        budgetEditingRef.current = false;
                        setPlanCartUserEditing(false);
                      }}
                      onChange={(e) => {
                        setBudgetInput(e.target.value);
                        const n = Number(e.target.value);
                        updateMeta({
                          totalBudget: Number.isFinite(n) && n > 0 ? n * 10_000 : undefined,
                        });
                      }}
                      className="h-11 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900"
                      placeholder={isKo ? "예: 4800" : "e.g. 4800"}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-white/60">
                      {tPlanner("industryLabel")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLANNER_INDUSTRY_KEYS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => updateMeta({ industryKey: k })}
                          className={cn(
                            "tkad-plan-cart-chip rounded-full px-3.5 py-2 text-sm font-semibold transition",
                            selectedIndustry === k
                              ? "tkad-plan-cart-chip-active bg-[color:var(--qp-accent)] shadow-sm ring-1 ring-[color:var(--qp-accent)]/40"
                              : "border border-gray-200 bg-white text-gray-900 dark:border-white/15 dark:bg-white/10 dark:text-white",
                          )}
                        >
                          {tPlanner(k)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-white/60">
                      {isKo ? "기간" : "Duration"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLAN_CART_DURATION_OPTIONS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => updateMeta({ duration: d.value })}
                          className={cn(
                            "tkad-plan-cart-chip rounded-full px-3.5 py-2 text-sm font-semibold transition",
                            (cart.duration ?? 1) === d.value
                              ? "tkad-plan-cart-chip-active bg-[color:var(--qp-accent)] shadow-sm ring-1 ring-[color:var(--qp-accent)]/40"
                              : "border border-gray-200 bg-white text-gray-900 dark:border-white/15 dark:bg-white/10 dark:text-white",
                          )}
                        >
                          {isKo ? d.ko : d.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 dark:text-white/55">
                    {isKo ? "총 매체" : "Total media"}
                  </span>
                  <span className="font-bold dark:text-white text-gray-900">
                    {cart.items.length}
                    {isKo ? "개" : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 dark:text-white/55">
                    {isKo ? "월 매체 합계" : "Monthly media"}
                  </span>
                  <span className="font-bold dark:text-white text-gray-900">
                    {formatWon(monthlyTotal)}
                  </span>
                </div>
                {addonTotal > 0 ? (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-white/55">
                      {isKo ? "부가 비용" : "Add-on costs"}
                    </span>
                    <span className="font-bold dark:text-white text-gray-900">
                      {formatWon(addonTotal)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t dark:border-white/10 border-gray-200 py-2 pt-3">
                  <span className="text-gray-500 dark:text-white/55">
                    {isKo ? `기간 총 예산 (${duration}개월)` : `Period total (${duration} mo)`}
                  </span>
                  <span className="font-black tkad-home-accent-text">
                    {formatWon(periodTotal)}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {isKo ? "(부가세 별도)" : "(VAT extra)"}
                    </span>
                  </span>
                </div>
              </section>
              </div>

              <div className="min-w-0 space-y-6">
              <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/50">
                    {isKo ? `담긴 매체 (${cart.items.length})` : `Media (${cart.items.length})`}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-white/45">
                    {isKo
                      ? "드래그하거나 ↑↓로 순서 변경 · 보고서에 반영됩니다"
                      : "Drag or use ↑↓ to reorder · reflected in report"}
                  </p>
                </div>
                {cart.items.map((item, index) => {
                  const media = catalogById.get(item.mediaId);
                  const packageMeta = resolveCartPackageMeta(item, media);
                  return (
                  <PlanCartLineCard
                    key={item.mediaId}
                    item={item}
                    media={media}
                    index={index}
                    total={cart.items.length}
                    isKo={isKo}
                    draggingId={draggingId}
                    dragOverId={dragOverId}
                    onRemove={remove}
                    onMove={moveItem}
                    onQuantityChange={(mediaId, units) =>
                      updateItem(mediaId, { quantity: units })
                    }
                    onPriceOptionChange={(mediaId, poIdx) => {
                      const m = catalogById.get(mediaId);
                      const meta = m ? packagePeriodToggleMeta(m, poIdx) : null;
                      updateItem(mediaId, {
                        priceOptionIndex: poIdx,
                        ...(meta ? {} : { usePackagePeriod: undefined, lineCampaignDays: undefined }),
                      });
                    }}
                    onGradeSelectionsChange={(mediaId, selections) =>
                      updateItem(mediaId, {
                        gradeSelections: selections,
                        quantity: undefined,
                        priceOptionIndex: undefined,
                        usePackagePeriod: undefined,
                        lineCampaignDays: undefined,
                      })
                    }
                    onOptionSelectionsChange={(mediaId, selections) =>
                      updateItem(mediaId, {
                        optionSelections: selections,
                        quantity: undefined,
                        priceOptionIndex: undefined,
                        usePackagePeriod: undefined,
                        lineCampaignDays: undefined,
                      })
                    }
                    onAddonLinesChange={(mediaId, lines) =>
                      updateItem(mediaId, { addonLines: lines })
                    }
                    onLineTotalWonChange={(mediaId, lineTotalWon) =>
                      updateItem(mediaId, { lineTotalWon })
                    }
                    usePackagePeriod={item.usePackagePeriod === true}
                    onPackagePeriodToggle={(mediaId, checked) =>
                      togglePackagePeriod(
                        mediaId,
                        checked,
                        packageMeta?.bundleDays,
                      )
                    }
                    packagePeriodMeta={packageMeta}
                    packagePeriodOnlyLabel={packagePeriodOnlyLabel}
                    onGripDragStart={setDraggingId}
                    onGripDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDropOnItem={handleDropOnItem}
                    onDragOverItem={setDragOverId}
                    onDragLeaveItem={(id) => {
                      if (dragOverId === id) setDragOverId(null);
                    }}
                  />
                  );
                })}
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <BtnBlock
                  href={reportHref}
                  variant="accent"
                  size="lg"
                  className="flex-1 rounded-2xl sm:min-w-[14rem]"
                >
                  {isKo ? "보고서 생성하기" : "Generate report"}
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </BtnBlock>
                <BtnBlock
                  href={plannerHref}
                  variant="secondary"
                  size="lg"
                  className="flex-1 rounded-2xl sm:min-w-[14rem]"
                >
                  <Sparkles className="mr-2 inline h-4 w-4" />
                  {isKo ? "플래너로 설계" : "Open planner"}
                </BtnBlock>
                <BtnBlock
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="rounded-2xl"
                  onClick={() => void handleQuoteRequest()}
                >
                  {isKo ? "견적 요청" : "Request quote"}
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </BtnBlock>
                <SavePlanButton
                  cart={cart}
                  isKo={isKo}
                  className="rounded-2xl"
                  redirectAfterSave
                />
                <BtnBlock
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="rounded-2xl"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 className="mr-2 inline h-4 w-4" />
                  {isKo ? "플랜 초기화" : "Clear plan"}
                </BtnBlock>
              </div>
              </div>
              </div>
            </>
          )}
        </PageContainer>
      </div>

      {confirmClear ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-[#0a0a12] bg-white p-6">
            <p className="font-bold dark:text-white text-gray-900">
              {isKo ? "플랜을 초기화할까요?" : "Clear your plan?"}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "담긴 매체와 설정만 삭제됩니다. 이미 저장한 스냅샷은 「저장 스냅샷」에 그대로 남습니다."
                : "Only clears the current cart. Saved snapshots remain under Plan snapshots."}
            </p>
            <div className="mt-6 flex gap-3">
              <BtnBlock
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmClear(false)}
              >
                {isKo ? "취소" : "Cancel"}
              </BtnBlock>
              <BtnBlock
                type="button"
                variant="accent"
                className="flex-1"
                onClick={handleClear}
              >
                {isKo ? "초기화" : "Clear"}
              </BtnBlock>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
