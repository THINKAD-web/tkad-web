"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Crown, CreditCard, Loader2, Sparkles, Zap, Rocket } from "lucide-react";
import { POINT_COSTS, type RedeemType } from "@/lib/points-constants";
import { formatProCardPriceLabel } from "@/lib/entitlements/pricing";
import { ProSubscriptionCheckout } from "@/components/pricing/pro-subscription-checkout";
import { SubscriptionConfirmOnReturn } from "@/components/pricing/subscription-confirm-on-return";
import {
  AGENCY_MONTHLY_KRW,
  LITE_MONTHLY_KRW,
} from "@/lib/entitlements/constants";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  loggedIn: boolean;
  userName?: string;
  userEmail?: string;
  isPro?: boolean;
  onPlanChange?: () => void;
};

function scrollToProUpgrade() {
  document.getElementById("pro-upgrade")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PRO_REDEEM: {
  type: Extract<RedeemType, "PRO_DAY" | "PRO_WEEK" | "PRO_MONTH">;
  icon: typeof Zap;
  badgeKo?: string;
  badgeEn?: string;
}[] = [
  { type: "PRO_DAY", icon: Zap },
  { type: "PRO_WEEK", icon: Rocket, badgeKo: "14% 절약", badgeEn: "Save 14%" },
  { type: "PRO_MONTH", icon: Crown, badgeKo: "33% 절약", badgeEn: "Save 33%" },
];

export function ProUpgradePanel({
  isKo,
  loggedIn,
  userName = "",
  userEmail = "",
  isPro = false,
  onPlanChange,
}: Props) {
  const t = useTranslations("points");
  const toast = useAppToast();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(loggedIn);
  const [redeeming, setRedeeming] = useState<RedeemType | null>(null);
  const [payMode, setPayMode] = useState<"points" | "card">("points");

  const loadBalance = useCallback(async () => {
    if (!loggedIn) {
      setBalance(null);
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    try {
      const res = await fetch("/api/points/balance", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 401) router.push("/login?redirect=/pricing#pro-upgrade");
        setBalance(0);
        return;
      }
      setBalance((data.data as { balance: number }).balance ?? 0);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, [loggedIn, router]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#pro-upgrade") {
      requestAnimationFrame(() => scrollToProUpgrade());
    }
  }, []);

  async function handleRedeem(type: RedeemType) {
    setRedeeming(type);
    try {
      const res = await fetch("/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(
          data?.error?.message ??
            (isKo ? "포인트가 부족하거나 교환에 실패했습니다." : "Redemption failed."),
        );
        return;
      }
      const ends = data.data?.proEndsAt as string | undefined;
      toast.success(
        isKo
          ? `PRO가 활성화되었습니다.${ends ? ` (~${new Date(ends).toLocaleDateString("ko-KR")})` : ""}`
          : `PRO activated.${ends ? ` Until ${new Date(ends).toLocaleDateString()}` : ""}`,
      );
      await loadBalance();
      onPlanChange?.();
    } catch {
      toast.error(isKo ? "교환에 실패했습니다." : "Redemption failed.");
    } finally {
      setRedeeming(null);
    }
  }

  if (!loggedIn) {
    return (
      <div
        id="pro-upgrade"
        className="scroll-mt-24 tkad-qp-pricing-card tkad-qp-accent-soft-surface border border-[color:var(--qp-accent)]/35 p-6 text-center sm:p-8"
      >
        <p className="text-sm font-semibold">
          {isKo
            ? "포인트 또는 카드로 PRO를 시작하려면 로그인해 주세요."
            : "Sign in to upgrade to PRO with points or card."}
        </p>
        <Link
          href="/login?redirect=/pricing#pro-upgrade"
          className="tkad-qp-cta mt-4 inline-flex h-11 items-center justify-center rounded-[var(--qp-radius-md)] px-8 text-sm font-black text-white"
        >
          {isKo ? "로그인하고 PRO 시작" : "Sign in to start PRO"}
        </Link>
        <p className="mt-3 text-xs text-gray-500 dark:text-white/50">
          {isKo ? "계정이 없으면 " : "No account? "}
          <Link href="/register" className="font-semibold text-[color:var(--qp-accent)] underline">
            {isKo ? "무료 가입" : "Sign up free"}
          </Link>
        </p>
      </div>
    );
  }

  const bal = balance ?? 0;

  return (
    <>
    <SubscriptionConfirmOnReturn isKo={isKo} onConfirmed={onPlanChange} />
    <div
      id="pro-upgrade"
      className="scroll-mt-24 tkad-qp-pricing-card tkad-qp-accent-soft-surface border border-[color:var(--qp-accent)]/35 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--qp-accent)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "PRO 업그레이드" : "Upgrade to PRO"}
          </p>
          <h3 className="mt-2 text-xl font-black sm:text-2xl">
            {isPro
              ? isKo
                ? "PRO 이용 중 · 기간 연장"
                : "You're on PRO · Extend access"
              : isKo
                ? "지금 PRO로 업그레이드"
                : "Upgrade to PRO now"}
          </h3>
          <p className="tkad-qp-text-muted-on-accent mt-2 max-w-xl text-sm">
            {isKo
              ? "보유 포인트로 바로 PRO를 받거나, 카드로 월 구독할 수 있습니다."
              : "Use your points instantly or subscribe monthly by card."}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-right dark:border-white/12 dark:bg-white/5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/45">
            {isKo ? "내 포인트" : "Your points"}
          </p>
          {loadingBalance ? (
            <Loader2 className="ml-auto mt-1 h-5 w-5 animate-spin text-[color:var(--qp-accent)]" />
          ) : (
            <p className="mt-0.5 text-2xl font-black tabular-nums text-[color:var(--qp-accent)]">
              {bal.toLocaleString(isKo ? "ko-KR" : "en-US")} P
            </p>
          )}
          <Link
            href="/points"
            className="mt-1 inline-block text-xs font-semibold text-[color:var(--qp-accent)] underline"
          >
            {isKo ? "포인트 더 모으기 →" : "Earn more points →"}
          </Link>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/12">
        <button
          type="button"
          onClick={() => setPayMode("points")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
            payMode === "points"
              ? "bg-[color:var(--qp-accent)] text-white"
              : "text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5",
          )}
        >
          {isKo ? "포인트 교환" : "Use points"}
        </button>
        <button
          type="button"
          onClick={() => setPayMode("card")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors",
            payMode === "card"
              ? "bg-[color:var(--qp-accent)] text-white"
              : "text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5",
          )}
        >
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          {formatProCardPriceLabel(isKo)}
        </button>
      </div>

      {payMode === "points" ? (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {PRO_REDEEM.map(({ type, icon: Icon, badgeKo, badgeEn }) => {
              const cost = POINT_COSTS[type];
              const canAfford = !loadingBalance && bal >= cost;
              return (
                <div
                  key={type}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4 transition-shadow",
                    canAfford
                      ? "border-[color:var(--qp-accent)]/40 bg-white shadow-sm dark:border-[color:var(--qp-accent)]/35 dark:bg-white/5"
                      : "border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-[color:var(--qp-accent)]" />
                      <p className="text-sm font-bold dark:text-white text-gray-900">
                        {t(`redeem.${type}`)}
                      </p>
                    </div>
                    {(isKo ? badgeKo : badgeEn) ? (
                      <span className="shrink-0 rounded-full bg-[color:var(--qp-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--qp-accent)]">
                        {isKo ? badgeKo : badgeEn}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xl font-black tabular-nums text-[color:var(--qp-accent)]">
                    {cost.toLocaleString(isKo ? "ko-KR" : "en-US")} P
                  </p>
                  <button
                    type="button"
                    disabled={!canAfford || redeeming === type || loadingBalance}
                    onClick={() => void handleRedeem(type)}
                    className={cn(
                      "mt-4 flex h-11 items-center justify-center rounded-xl text-xs font-bold transition-colors",
                      canAfford
                        ? "bg-[color:var(--qp-accent)] text-white hover:bg-[color:var(--qp-accent-hover)]"
                        : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40",
                    )}
                  >
                    {redeeming === type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : canAfford ? (
                      isKo ? "포인트로 PRO 받기" : "Redeem for PRO"
                    ) : isKo ? (
                      `포인트 ${(cost - bal).toLocaleString()}P 부족`
                    ) : (
                      `Need ${(cost - bal).toLocaleString()} more P`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-white/45">
            {isKo
              ? "포인트 교환 시 즉시 PRO 기능이 열립니다. 기존 PRO 기간이 있으면 자동으로 이어집니다."
              : "PRO unlocks immediately. Existing PRO time stacks."}
          </p>
        </div>
      ) : (
        <div className="mt-5 max-w-lg">
          <p className="mb-4 text-sm text-gray-600 dark:text-white/65">
            {isKo
              ? "토스페이먼츠로 안전하게 결제됩니다. 매월 자동 갱신 구독입니다."
              : "Secure payment via Toss Payments. Billed monthly."}
          </p>
          <ProSubscriptionCheckout
            isKo={isKo}
            customerName={userName}
            customerEmail={userEmail}
            plan="PRO"
          />
        </div>
      )}
    </div>

      <div
        id="lite-upgrade"
        className="scroll-mt-24 mt-6 tkad-qp-pricing-card border border-gray-200 bg-gray-50/80 p-6 dark:border-white/12 dark:bg-white/5 sm:p-8"
      >
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-white/50">
          LITE
        </p>
        <h3 className="mt-2 text-lg font-black dark:text-white text-gray-900">
          {isKo
            ? `플래너 결과 · PDF — 월 ₩${LITE_MONTHLY_KRW.toLocaleString("ko-KR")}`
            : `Planner results & PDF — ₩${LITE_MONTHLY_KRW.toLocaleString("en-US")}/mo`}
        </h3>
        <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-white/65">
          {isKo
            ? "AI 시뮬레이션·경쟁 분석·마켓 데이터는 포함되지 않습니다."
            : "Does not include AI simulation, competitor analysis, or market data."}
        </p>
        <div className="mt-5 max-w-lg">
          <ProSubscriptionCheckout
            isKo={isKo}
            customerName={userName}
            customerEmail={userEmail}
            plan="LITE"
            autoStart={false}
          />
        </div>
      </div>

      <div
        id="agency-upgrade"
        className="scroll-mt-24 mt-6 tkad-qp-pricing-card border border-gray-200 bg-gray-50/80 p-6 dark:border-white/12 dark:bg-white/5 sm:p-8"
      >
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-white/50">
          AGENCY
        </p>
        <h3 className="mt-2 text-lg font-black dark:text-white text-gray-900">
          {isKo
            ? `PRO 기능 + 팀 좌석 — 월 ₩${AGENCY_MONTHLY_KRW.toLocaleString("ko-KR")}`
            : `PRO features + team seats — ₩${AGENCY_MONTHLY_KRW.toLocaleString("en-US")}/mo`}
        </h3>
        <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-white/65">
          {isKo
            ? "대행사·팀을 위한 좌석. 화이트라벨은 별도 검토 대상입니다."
            : "Seats for agency teams. White-label is not included."}
        </p>
        <div className="mt-5 max-w-lg">
          <ProSubscriptionCheckout
            isKo={isKo}
            customerName={userName}
            customerEmail={userEmail}
            plan="AGENCY"
            autoStart={false}
          />
        </div>
      </div>
    </>
  );
}
