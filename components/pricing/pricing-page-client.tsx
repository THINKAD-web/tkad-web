"use client";

import { Link } from "@/i18n/navigation";
import { Check, Sparkles } from "lucide-react";
import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";
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
  "tkad-pricing-outline-btn mt-8 flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-colors";

const planCtaPrimaryClass =
  "tkad-neon-cta-clean mt-8 flex h-11 w-full items-center justify-center rounded-xl text-sm font-black text-white";

const PLANS = {
  free: {
    featuresKo: [
      "매체 목록·기본 스펙 조회",
      "플래너 Step 1~2 (조건 입력)",
      "비교·찜하기 (로그인)",
    ],
    featuresEn: [
      "Media list & basic specs",
      "Planner steps 1–2 (inputs)",
      "Compare & favorites (signed in)",
    ],
  },
  pro: {
    featuresKo: [
      "플래너 PDF 보고서 무제한",
      "상세 유동인구·경쟁 매체 비교",
      "OTS·Reach·빈도 시뮬레이션 전체",
      "캠페인 제안서 자동 생성",
    ],
    featuresEn: [
      "Unlimited planner PDF reports",
      "Detailed footfall & competitor data",
      "Full OTS·Reach·frequency simulation",
      "Auto-generated campaign proposals",
    ],
  },
  enterprise: {
    featuresKo: ["API 접근", "화이트라벨 보고서", "전담 담당자", "맞춤 데이터 리포트"],
    featuresEn: ["API access", "White-label reports", "Dedicated manager", "Custom data reports"],
  },
};

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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {(["free", "pro", "enterprise"] as const).map((key) => {
          const plan = PLANS[key];
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
              {key === "pro" ? (
                <div className="mt-2">
                  <ProMonthlyPriceDisplay isKo={isKo} />
                </div>
              ) : key === "free" ? (
                <p className="mt-2 text-2xl font-black text-cyan-700 dark:text-cyan-200">
                  {isKo ? "무료" : "Free"}
                </p>
              ) : (
                <p className="mt-2 text-2xl font-black text-cyan-700 dark:text-cyan-200">
                  {isKo ? "문의" : "Contact us"}
                </p>
              )}
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
                {(isKo ? plan.featuresKo : plan.featuresEn).map((f) => (
                  <li key={f} className="flex gap-2 text-sm dark:text-white text-gray-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" aria-hidden />
                    {f}
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
