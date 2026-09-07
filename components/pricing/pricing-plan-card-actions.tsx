"use client";

import { Link } from "@/i18n/navigation";
import { useIsPro } from "@/hooks/use-is-pro";
import type { PricingPlanId } from "@/lib/entitlements/pricing-plans";

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

type Props = {
  planId: PricingPlanId;
  isKo: boolean;
  loggedIn: boolean;
};

export function PricingPlanCardActions({
  planId,
  isKo,
  loggedIn,
}: Props) {
  const { isPro, loading: planLoading } = useIsPro();

  if (planId === "free") {
    return (
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
    );
  }

  if (planId === "lite") {
    return loggedIn ? (
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
    );
  }

  if (planId === "pro") {
    return (
      <>
        {isPro && !planLoading ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {isKo ? "현재 PRO 이용 중" : "PRO active"}
          </p>
        ) : null}
        {loggedIn ? (
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
        )}
      </>
    );
  }

  if (planId === "agency") {
    return loggedIn ? (
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
    );
  }

  if (planId === "enterprise") {
    return (
      <Link href="/contact" className={planOutlineBtnClass}>
        {isKo ? "엔터프라이즈 문의" : "Contact sales"}
      </Link>
    );
  }

  return null;
}
