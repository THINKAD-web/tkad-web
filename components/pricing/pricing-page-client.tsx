"use client";

import { Link } from "@/i18n/navigation";
import { Check, Clock, Sparkles } from "lucide-react";
import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";
import {
  getPricingGuestFootnote,
  getPricingPlans,
  type PricingPlanKey,
} from "@/lib/entitlements/pricing-plans";
import { ProUpgradePanel } from "@/components/pricing/pro-upgrade-panel";
import { useIsPro } from "@/hooks/use-is-pro";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  loggedIn: boolean;
  userName?: string;
  userEmail?: string;
  showTrial?: boolean;
};

/** appearance day/night — `tkad-pricing-outline-btn` (globals.css) */
const planOutlineBtnClass =
  "tkad-pricing-outline-btn mt-8 flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-colors";

const planCtaPrimaryClass =
  "tkad-neon-cta-clean mt-8 flex h-11 w-full items-center justify-center rounded-xl text-sm font-black text-white";

function scrollToProUpgrade() {
  document.getElementById("pro-upgrade")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PricingPageClient({
  isKo,
  loggedIn,
  userName = "",
  userEmail = "",
  showTrial,
}: Props) {
  const { isPro, refresh, loading: planLoading } = useIsPro();
  const plans = getPricingPlans(isKo);
  const guestFootnote = getPricingGuestFootnote(isKo);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {(["free", "pro", "enterprise"] as const).map((key: PricingPlanKey) => {
          const plan = plans[key];
          const highlighted = key === "pro";
          return (
            <article
              key={key}
              className={`rounded-[28px] border p-6 backdrop-blur sm:p-8 ${ highlighted ? "border-cyan-400/40 dark:bg-white/10 bg-gray-100 tkad-neon-border shadow-[0_0_40px_rgba(34,211,238,0.12)]" : "dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50" }`}
            >
              {highlighted ? (
                <p className="mb-3 inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {isKo ? "인기" : "Popular"}
                </p>
              ) : null}
              <h2 className="text-xl font-black uppercase dark:text-white text-gray-900">
                {key === "free" ? "FREE" : key === "pro" ? "PRO" : "ENTERPRISE"}
              </h2>
              <p className="mt-2 text-2xl font-black text-cyan-700 dark:text-cyan-200">
                {plan.price}
              </p>
              {key === "pro" && showTrial && !isPro ? (
                <p className="mt-2 text-xs font-semibold text-pink-700 dark:text-pink-200">
                  {isKo
                    ? `첫 가입 ${PRO_TRIAL_DAYS}일 PRO 무료 체험`
                    : `${PRO_TRIAL_DAYS}-day PRO trial for new signups`}
                </p>
              ) : null}
              {key === "pro" && isPro && !planLoading ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {isKo ? "현재 PRO 이용 중" : "PRO active"}
                </p>
              ) : null}
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={cn(
                      "flex gap-2 text-sm dark:text-white text-gray-800",
                      f.comingSoon && "opacity-75",
                    )}
                  >
                    {f.comingSoon ? (
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300"
                        aria-hidden
                      />
                    ) : (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300"
                        aria-hidden
                      />
                    )}
                    <span>
                      {f.text}
                      {f.comingSoon ? (
                        <span className="ml-1.5 inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
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
                  {loggedIn ? (isKo ? "매체 탐색" : "Browse media") : isKo ? "무료 가입" : "Sign up free"}
                </Link>
              ) : null}
              {key === "pro" ? (
                loggedIn ? (
                  <button type="button" onClick={scrollToProUpgrade} className={planCtaPrimaryClass}>
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
              {key === "enterprise" ? (
                <Link href="/contact" className={planOutlineBtnClass}>
                  {isKo ? "엔터프라이즈 문의" : "Contact sales"}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>

      {!loggedIn ? (
        <p className="text-center text-sm text-muted-foreground">{guestFootnote}</p>
      ) : null}

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
