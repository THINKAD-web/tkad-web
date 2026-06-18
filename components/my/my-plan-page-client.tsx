"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowRight, Sparkles, Trash2, X } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { BtnBlock } from "@/components/brutalist";
import { usePlanCart } from "@/hooks/use-plan-cart";
import {
  PLAN_CART_DURATION_OPTIONS,
  PLAN_CART_GOAL_OPTIONS,
  planCartAddedFromLabel,
  planCartMonthlyTotal,
} from "@/lib/plan-cart";
import { buildMyPlanPlannerHref } from "@/lib/plan-cart-planner-bridge";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

export function MyPlanPageClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const toast = useAppToast();
  const { cart, remove, clear, updateMeta } = usePlanCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

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

  function formatWon(amount: number) {
    if (amount <= 0) return isKo ? "문의" : "Inquire";
    return formatCatalogPriceFieldWon(amount, isKo ? "ko-KR" : "en-US");
  }

  async function handleQuoteRequest() {
    if (cart.items.length === 0) return;
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
    router.push("/contact?from=plan");
  }

  function handleClear() {
    clear();
    setConfirmClear(false);
    toast.success(isKo ? "플랜을 초기화했습니다." : "Plan cleared.");
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] px-4 py-8 pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-600/70 dark:text-cyan-300/70">
              [ MY PLAN ]
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              {isKo ? "내 플랜" : "My plan"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "담은 매체로 견적을 요청하세요"
                : "Request a quote for your selected media"}
            </p>
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
                    <div className="flex flex-wrap gap-2">
                      {PLAN_CART_GOAL_OPTIONS.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => updateMeta({ campaignGoal: g.value })}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            cart.campaignGoal === g.value
                              ? "bg-violet-500 text-white"
                              : "dark:bg-white/10 bg-gray-100 dark:text-white/80 text-gray-700",
                          )}
                        >
                          {isKo ? g.ko : g.en}
                        </button>
                      ))}
                    </div>
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
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            (cart.duration ?? 1) === d.value
                              ? "bg-cyan-500 text-white"
                              : "dark:bg-white/10 bg-gray-100 dark:text-white/80 text-gray-700",
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
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/50">
                  {isKo ? `담긴 매체 (${cart.items.length})` : `Media (${cart.items.length})`}
                </p>
                {cart.items.map((item) => (
                  <article
                    key={item.mediaId}
                    className="flex gap-3 rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-3"
                  >
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
                      <p className="truncate text-sm font-bold dark:text-white text-gray-900">
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
                  type="button"
                  variant="accent"
                  size="lg"
                  className="flex-1 rounded-2xl sm:min-w-[14rem]"
                  onClick={() => void handleQuoteRequest()}
                >
                  {isKo ? "이 플랜으로 견적 요청하기" : "Request quote for this plan"}
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </BtnBlock>
                <BtnBlock
                  href={plannerHref}
                  variant="secondary"
                  size="lg"
                  className="flex-1 rounded-2xl sm:min-w-[14rem]"
                >
                  <Sparkles className="mr-2 inline h-4 w-4" />
                  {isKo ? "플래너로 설계하기" : "Design in planner"}
                </BtnBlock>
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
        </div>
      </div>

      {confirmClear ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-[#0a0a12] bg-white p-6">
            <p className="font-bold dark:text-white text-gray-900">
              {isKo ? "플랜을 초기화할까요?" : "Clear your plan?"}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
              {isKo
                ? "담긴 매체와 설정이 모두 삭제됩니다."
                : "All selected media and settings will be removed."}
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
