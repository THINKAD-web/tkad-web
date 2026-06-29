"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowRight, ChevronDown, ChevronUp, GripVertical, Sparkles, Trash2, X } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageContainer } from "@/components/layout/page-container";
import { MOBILE_CHROME_BOTTOM_PAD } from "@/lib/layout/container-classes";
import { BtnBlock } from "@/components/brutalist";
import { usePlanCart } from "@/hooks/use-plan-cart";
import {
  PLAN_CART_DURATION_OPTIONS,
  planCartAddedFromLabel,
  planCartMonthlyTotal,
} from "@/lib/plan-cart";
import {
  buildMyPlanPlannerHref,
  mapPlanCartGoalToPlanner,
} from "@/lib/plan-cart-planner-bridge";
import { PlannerCampaignGoalGrid } from "@/components/planner/planner-campaign-goal-grid";
import { SavePlanButton } from "@/components/my/save-plan-button";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

export function MyPlanPageClient() {
  const tPlan = useTranslations("planNav");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const toast = useAppToast();
  const { cart, remove, clear, updateMeta, reorder } = usePlanCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    setBudgetInput(
      cart.totalBudget != null && cart.totalBudget > 0
        ? String(Math.round(cart.totalBudget / 10_000))
        : "",
    );
  }, [cart.totalBudget]);

  const monthlyTotal = useMemo(() => planCartMonthlyTotal(cart), [cart]);
  const duration = cart.duration ?? 1;
  const periodTotal = monthlyTotal * duration;
  const plannerHref = buildMyPlanPlannerHref(
    cart.items.map((item) => item.mediaId),
  );
  const reportHref = "/my/plan/report";
  const selectedGoal = mapPlanCartGoalToPlanner(cart.campaignGoal);

  function formatWon(amount: number) {
    if (amount <= 0) return isKo ? "문의" : "Inquire";
    return formatCatalogPriceFieldWon(amount, isKo ? "ko-KR" : "en-US");
  }

  async function handleQuoteRequest() {
    const mediaIds = cart.items.map((item) => item.mediaId).filter(Boolean);
    if (mediaIds.length === 0) {
      toast.warning(isKo ? "담은 매체가 없습니다." : "No media in your plan.");
      return;
    }
    try {
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await sessionRes.json();
      if (sessionData?.ok && sessionData.data) {
        await fetch("/api/my/plan/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items,
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
    <HomeLandingDayNight>
      <div
        className={cn(
          "tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] py-8",
          MOBILE_CHROME_BOTTOM_PAD,
        )}
      >
        <PageContainer>
          <div className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-600/70 dark:text-cyan-300/70">
              [ MY PLAN ]
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              {tPlan("cart")}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "담은 매체로 보고서를 만들거나 견적을 요청하세요. 저장 후에는 「저장한 플랜」에서 확인할 수 있습니다."
                : "Generate a report or request a quote. After saving, open Saved plans."}
            </p>
            <div className="mt-3">
              <Link
                href="/my/plan/saved"
                className="text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-100"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-bold text-white"
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
                              ? "tkad-plan-cart-chip-active bg-cyan-600 shadow-sm ring-1 ring-cyan-400/40"
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
                    {isKo ? "월 총 예산" : "Monthly total"}
                  </span>
                  <span className="font-bold dark:text-white text-gray-900">
                    {formatWon(monthlyTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t dark:border-white/10 border-gray-200 py-2 pt-3">
                  <span className="text-gray-500 dark:text-white/55">
                    {isKo ? "기간 총 예산" : "Period total"}
                  </span>
                  <span className="font-black tkad-home-accent-text">
                    {formatWon(periodTotal)}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {isKo ? "(제작비·부가세 별도)" : "(Production & VAT extra)"}
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
                {cart.items.map((item, index) => (
                  <article
                    key={item.mediaId}
                    draggable
                    onDragStart={() => setDraggingId(item.mediaId)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId && draggingId !== item.mediaId) {
                        setDragOverId(item.mediaId);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === item.mediaId) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnItem(item.mediaId);
                    }}
                    className={cn(
                      "flex gap-2 rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-3 transition",
                      draggingId === item.mediaId && "opacity-60",
                      dragOverId === item.mediaId &&
                        draggingId !== item.mediaId &&
                        "ring-2 ring-violet-400/70",
                    )}
                  >
                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                      <button
                        type="button"
                        className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg dark:bg-white/10 bg-gray-200 text-gray-500 active:cursor-grabbing dark:text-white/55"
                        aria-label={isKo ? "순서 변경" : "Reorder"}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(item.mediaId, "up")}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex h-6 w-7 items-center justify-center rounded-md dark:bg-white/10 bg-gray-200 text-gray-600 disabled:opacity-30 dark:text-white/70"
                        aria-label={isKo ? "위로" : "Move up"}
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={index === cart.items.length - 1}
                        onClick={() => moveItem(item.mediaId, "down")}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex h-6 w-7 items-center justify-center rounded-md dark:bg-white/10 bg-gray-200 text-gray-600 disabled:opacity-30 dark:text-white/70"
                        aria-label={isKo ? "아래로" : "Move down"}
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug break-words dark:text-white text-gray-900">
                        {item.mediaName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {[item.region, item.mediaType].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-sm font-semibold tkad-home-accent-text">
                        {formatWon(item.price)}
                        {isKo ? "/월" : "/mo"}
                      </p>
                      <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                      <span className="mt-1 inline-block rounded-full dark:bg-white/10 bg-gray-200 px-2 py-0.5 text-[10px] font-semibold dark:text-white/70 text-gray-600">
                        {planCartAddedFromLabel(item.addedFrom, isKo)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.mediaId)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl dark:bg-white/10 bg-gray-200 dark:text-white/70 text-gray-600"
                      aria-label={isKo ? "삭제" : "Remove"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </article>
                ))}
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
                ? "담긴 매체와 설정만 삭제됩니다. 이미 저장한 플랜은 「저장된 플랜」에 그대로 남습니다."
                : "Only clears the current cart. Saved snapshots remain under Saved plans."}
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
    </HomeLandingDayNight>
  );
}
