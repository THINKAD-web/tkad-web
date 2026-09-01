"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Check, Sparkles } from "lucide-react";
import {
  AGENCY_MONTHLY_KRW,
  LITE_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
} from "@/lib/entitlements/constants";
import {
  getPricingGuestFootnote,
  getPricingPlans,
  type PricingPlanId,
} from "@/lib/entitlements/pricing-plans";
import { ProUpgradePanel } from "@/components/pricing/pro-upgrade-panel";
import { ProMonthlyPriceDisplay } from "@/components/pricing/pro-monthly-price";
import { useIsPro } from "@/hooks/use-is-pro";

type Props = {
  isKo: boolean;
  loggedIn: boolean;
  userName?: string;
  userEmail?: string;
  showTrial?: boolean;
};

/** appearance day/night — `tkad-pricing-outline-btn` (globals.css) */
const planOutlineBtnClass =
  "tkad-pricing-outline-btn mt-8 flex h-11 items-center justify-center rounded-[var(--qp-radius-md)] border text-sm font-bold transition-colors";

const planCtaPrimaryClass =
  "tkad-qp-cta mt-8 flex h-11 w-full items-center justify-center rounded-[var(--qp-radius-md)] text-sm font-black text-white";

function scrollToCheckout(plan: "lite" | "pro" | "agency") {
  const id =
    plan === "lite"
      ? "lite-upgrade"
      : plan === "agency"
        ? "agency-upgrade"
        : "pro-upgrade";
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function planTitle(id: PricingPlanId): string {
  if (id === "free") return "FREE";
  if (id === "lite") return "LITE";
  if (id === "pro") return "PRO";
  if (id === "agency") return "AGENCY";
  return "ENTERPRISE";
}

function formatMonthlyKrw(amount: number, isKo: boolean): string {
  const n = amount.toLocaleString(isKo ? "ko-KR" : "en-US");
  return isKo ? `월 ₩${n}` : `₩${n}/mo`;
}

export function PricingPageClient({
  isKo,
  loggedIn,
  userName = "",
  userEmail = "",
  showTrial,
}: Props) {
  const { isPro, refresh, loading: planLoading } = useIsPro();
  const plans = useMemo(() => getPricingPlans(isKo), [isKo]);
  const guestFootnote = useMemo(() => getPricingGuestFootnote(isKo), [isKo]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((plan) => {
          const key = plan.id;
          const highlighted = key === "pro";
          return (
            <article
              key={key}
              className={`rounded-[var(--qp-radius-md)] border p-6 backdrop-blur sm:p-8 ${highlighted ? "tkad-qp-pricing-card tkad-qp-accent-soft-surface border-[color:var(--qp-accent)]/45" : "tkad-qp-pricing-card dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50"}`}
            >
              {highlighted ? (
                <p className="mb-3 inline-flex items-center gap-1 rounded-full border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-2.5 py-0.5 tkad-type-label text-[color:var(--qp-accent)]">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {isKo ? "인기" : "Popular"}
                </p>
              ) : null}
              <h2 className="text-xl font-black uppercase">
                {planTitle(key)}
              </h2>
              {key === "pro" ? (
                <div className="mt-2">
                  <ProMonthlyPriceDisplay isKo={isKo} />
                </div>
              ) : key === "free" ? (
                <p className="mt-2 text-2xl font-black text-gray-800 dark:text-white">
                  {isKo ? "무료" : "Free"}
                </p>
              ) : key === "lite" ? (
                <p className="mt-2 text-2xl font-black text-gray-800 dark:text-white">
                  {formatMonthlyKrw(LITE_MONTHLY_KRW, isKo)}
                </p>
              ) : key === "agency" ? (
                <p className="mt-2 text-2xl font-black text-gray-800 dark:text-white">
                  {formatMonthlyKrw(AGENCY_MONTHLY_KRW, isKo)}
                </p>
              ) : (
                <p className="mt-2 text-2xl font-black text-gray-800 dark:text-white">
                  {isKo ? "문의" : "Contact us"}
                </p>
              )}
              {key === "pro" && showTrial && !isPro ? (
                <p className="mt-2 tkad-type-title text-[color:var(--qp-accent)]">
                  {isKo
                    ? `첫 가입 ${PRO_TRIAL_DAYS}일 PRO 무료 체험`
                    : `${PRO_TRIAL_DAYS}-day PRO trial for new signups`}
                </p>
              ) : null}
              {key === "pro" && isPro && !planLoading ? (
                <p className="mt-2 tkad-type-title text-emerald-700 dark:text-emerald-300">
                  {isKo ? "현재 PRO 이용 중" : "PRO active"}
                </p>
              ) : null}
              <ul className="mt-6 space-y-2">
                {plan.features
                  .filter((f) => f.id !== "price")
                  .map((f) => (
                    <li
                      key={f.id}
                      className="flex gap-2 text-sm tkad-qp-text-primary"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--qp-accent)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        {f.text}
                        {f.comingSoon ? (
                          <span className="ml-1.5 inline-flex rounded-full border border-amber-400/50 bg-amber-500/10 px-1.5 py-0.5 tkad-type-note font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                            {isKo ? "준비 중" : "Coming soon"}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ul>
              {key === "free" ? (
                <Link
                  href={loggedIn ? "/media" : "/register"}
                  className={planOutlineBtnClass}
                >
                  {loggedIn
                    ? isKo
                      ? "매체 탐색"
                      : "Browse media"
                    : isKo
                      ? "무료 가입"
                      : "Sign up free"}
                </Link>
              ) : null}
              {key === "lite" ? (
                loggedIn ? (
                  <button
                    type="button"
                    onClick={() => scrollToCheckout("lite")}
                    className={planOutlineBtnClass}
                  >
                    {isKo ? "LITE 시작하기 ↓" : "Get LITE ↓"}
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/pricing#lite-upgrade"
                    className={planOutlineBtnClass}
                  >
                    {isKo ? "로그인 후 LITE" : "Sign in for LITE"}
                  </Link>
                )
              ) : null}
              {key === "pro" ? (
                loggedIn ? (
                  <button
                    type="button"
                    onClick={() => scrollToCheckout("pro")}
                    className={planCtaPrimaryClass}
                  >
                    {isPro
                      ? isKo
                        ? "PRO 기간 연장하기 ↓"
                        : "Extend PRO ↓"
                      : isKo
                        ? "PRO 시작하기 ↓"
                        : "Get PRO ↓"}
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/pricing#pro-upgrade"
                    className={planCtaPrimaryClass}
                  >
                    {isKo ? "로그인 후 PRO 시작" : "Sign in for PRO"}
                  </Link>
                )
              ) : null}
              {key === "agency" ? (
                loggedIn ? (
                  <button
                    type="button"
                    onClick={() => scrollToCheckout("agency")}
                    className={planOutlineBtnClass}
                  >
                    {isKo ? "AGENCY 시작하기 ↓" : "Get AGENCY ↓"}
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/pricing#agency-upgrade"
                    className={planOutlineBtnClass}
                  >
                    {isKo ? "로그인 후 AGENCY" : "Sign in for AGENCY"}
                  </Link>
                )
              ) : null}
              {key === "enterprise" ? (
                <Link href="/contact" className={planOutlineBtnClass}>
                  {isKo ? "엔터프라이즈 문의" : "Contact sales"}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-white/50">
        {guestFootnote}
      </p>

      <ProUpgradePanel
        isKo={isKo}
        loggedIn={loggedIn}
        userName={userName}
        userEmail={userEmail}
        isPro={isPro}
        onPlanChange={() => void refresh()}
      />
    </div>
  );
}
