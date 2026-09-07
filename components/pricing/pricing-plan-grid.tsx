import { Check, Sparkles } from "lucide-react";
import {
  AGENCY_MONTHLY_KRW,
  LITE_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
} from "@/lib/entitlements/constants";
import { getProPriceDisplay } from "@/lib/entitlements/pricing";
import {
  getPricingPlans,
  type PricingPlanId,
} from "@/lib/entitlements/pricing-plans";
import { PricingPlanCardActions } from "@/components/pricing/pricing-plan-card-actions";

type Props = {
  isKo: boolean;
  loggedIn: boolean;
  showTrial?: boolean;
};

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

function ProPriceBlock({ isKo }: { isKo: boolean }) {
  const d = getProPriceDisplay();
  return (
    <div className="mt-2 space-y-1">
      {d.hasDiscount ? (
        <span className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pink-700 dark:text-pink-200">
          {isKo ? `${d.discountPercent}% 할인` : `${d.discountPercent}% off`}
        </span>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {d.hasDiscount ? (
          <span
            className="text-base font-semibold text-gray-400 line-through decoration-gray-400/80 dark:text-white/35"
            aria-hidden
          >
            {formatMonthlyKrw(d.listPriceKrw, isKo)}
          </span>
        ) : null}
        <p className="text-2xl font-black text-gray-800 dark:text-white">
          {formatMonthlyKrw(d.salePriceKrw, isKo)}
        </p>
      </div>
    </div>
  );
}

/** SSR-friendly plan cards — prices visible without client hydration. */
export function PricingPlanGrid({ isKo, loggedIn, showTrial }: Props) {
  const plans = getPricingPlans(isKo);

  return (
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
              <p className="mb-3 inline-flex items-center gap-1 rounded-full border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-2.5 py-0.5 font-display text-xs font-medium uppercase tracking-wider text-[color:var(--qp-accent)]">
                <Sparkles className="h-3 w-3" aria-hidden />
                {isKo ? "인기" : "Popular"}
              </p>
            ) : null}
            <h2 className="text-xl font-black uppercase">{planTitle(key)}</h2>
            {key === "pro" ? (
              <ProPriceBlock isKo={isKo} />
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
            {key === "pro" && showTrial ? (
              <p className="mt-2 text-xs font-semibold text-[color:var(--qp-accent)]">
                {isKo
                  ? `첫 가입 ${PRO_TRIAL_DAYS}일 PRO 무료 체험`
                  : `${PRO_TRIAL_DAYS}-day PRO trial for new signups`}
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
                        <span className="ml-1.5 inline-flex rounded-full border border-amber-400/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                          {isKo ? "준비 중" : "Coming soon"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
            </ul>
            <PricingPlanCardActions
              planId={key}
              isKo={isKo}
              loggedIn={loggedIn}
            />
          </article>
        );
      })}
    </div>
  );
}
